"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import * as faceapi from '@vladmandic/face-api';

export default function ClientPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [user, setUser] = useState<{ name: string; role: string; username: string; hasFaceRegistered?: boolean; faceDescriptor?: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [enableDailyLimit, setEnableDailyLimit] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Gagal memuat model face-api", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEnableDailyLimit(data.data.enableDailyLimit);
        }
      });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      });
  }, [router]);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data absensi", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const detectFaceFromWebcam = async (): Promise<Float32Array | null> => {
    const photoSrc = webcamRef.current?.getScreenshot();
    if (!photoSrc) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = photoSrc;
      img.onload = async () => {
        try {
          const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
          
          if (detection) {
            resolve(detection.descriptor);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Face detection error:", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
    });
  };

  const handleDaftarWajah = async () => {
    if (!modelsLoaded) {
      setMessage({ text: "Model pengenalan wajah sedang dimuat, mohon tunggu...", type: "info" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Sedang memindai wajah...", type: "info" });

    const descriptor = await detectFaceFromWebcam();
    if (!descriptor) {
      setMessage({ text: "Wajah tidak terdeteksi. Pastikan wajah terlihat jelas di kamera.", type: "error" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: Array.from(descriptor) })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Wajah berhasil didaftarkan!", type: "success" });
        setUser(prev => prev ? { ...prev, hasFaceRegistered: true, faceDescriptor: Array.from(descriptor) } : null);
      } else {
        setMessage({ text: data.error || "Gagal mendaftarkan wajah", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan saat mendaftarkan wajah", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAbsen = useCallback(async (type: 'masuk' | 'keluar') => {
    if (!modelsLoaded) {
      setMessage({ text: "Model pengenalan wajah sedang dimuat, mohon tunggu...", type: "info" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Sedang memverifikasi wajah...", type: "info" });

    if (!user?.hasFaceRegistered || !user?.faceDescriptor) {
      setMessage({ text: "Silakan daftarkan wajah terlebih dahulu", type: "error" });
      setLoading(false);
      return;
    }

    const currentDescriptor = await detectFaceFromWebcam();
    if (!currentDescriptor) {
      setMessage({ text: "Wajah tidak terdeteksi di kamera.", type: "error" });
      setLoading(false);
      return;
    }

    const savedDescriptor = new Float32Array(user.faceDescriptor);
    const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);

    // Ambang batas pengenalan wajah (makin kecil makin ketat)
    if (distance > 0.55) {
      setMessage({ text: "Akses Ditolak! Wajah tidak dikenali. Dilarang melakukan titip absen.", type: "error" });
      setLoading(false);
      return;
    }

    setMessage({ text: "Wajah terverifikasi. Sedang mendapatkan lokasi...", type: "info" });

    if (!navigator.geolocation) {
      setMessage({ text: "Geolocation tidak didukung oleh browser Anda", type: "error" });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const photoSrc = webcamRef.current?.getScreenshot();
        if (!photoSrc) {
          setMessage({ text: "Gagal mengambil foto. Pastikan kamera menyala dan Anda mengizinkan akses kamera.", type: "error" });
          setLoading(false);
          return;
        }

        try {
          const res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photo: photoSrc,
              latitude: coords.latitude,
              longitude: coords.longitude,
              type,
            }),
          });

          const data = await res.json();
          if (data.success) {
            setMessage({ text: "Absensi berhasil disimpan!", type: "success" });
            fetchRecords(); 
          } else {
            const errorMsg = data.details ? `${data.error} (${data.details})` : data.error || "Gagal menyimpan absensi";
            setMessage({ text: errorMsg, type: "error" });
          }
        } catch (err) {
          setMessage({ text: "Terjadi kesalahan sistem saat menghubungi server", type: "error" });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setMessage({ text: "Gagal mendapatkan lokasi. Pastikan Anda mengizinkan akses lokasi pada browser.", type: "error" });
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [webcamRef, user, modelsLoaded]);

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const myTodayRecord = records.find(record => {
    return record.employeeName === user.name && new Date(record.date).getTime() === startOfDay.getTime();
  });
  
  const hasAbsenMasuk = !!myTodayRecord?.waktuMasuk;
  const hasAbsenKeluar = !!myTodayRecord?.waktuKeluar;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8 font-sans text-gray-900">
      <main className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Halo, {user.name}!</h2>
            <p className="text-sm text-gray-500">Anda login sebagai {user.role === 'admin' ? 'Administrator' : 'Karyawan'} (@{user.username})</p>
          </div>
          <div className="flex gap-3">
            {user.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-xl hover:bg-purple-200 transition-colors">
                Dashboard Admin
              </button>
            )}
            <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">
              Keluar
            </button>
          </div>
        </div>

        <div className="text-center space-y-3 pt-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-sm">
           E-Absensi
          </h1>
          <p className="text-gray-500 font-medium">Catat kehadiran Anda dengan verifikasi wajah dan lokasi real-time.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl border border-white/40 h-fit">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              Form Absen
            </h2>
            <div className="space-y-6">
              
              <div className="space-y-3">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Verifikasi Wajah
                  {!modelsLoaded && <span className="ml-2 text-blue-500 animate-pulse text-xs">(Memuat model AI...)</span>}
                </label>
                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex justify-center border-4 border-gray-100 aspect-video relative shadow-inner group">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                  />
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
                <p className="text-xs text-gray-500 text-center font-medium">Pastikan wajah terlihat jelas di kamera.</p>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm shadow-green-100' : 
                  message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm shadow-red-100' :
                  'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm shadow-blue-100'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {!user.hasFaceRegistered ? (
                  <button
                    type="button"
                    onClick={handleDaftarWajah}
                    disabled={loading || !modelsLoaded}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.98] flex justify-center items-center gap-2"
                  >
                    {loading ? 'Memproses...' : 'Daftarkan Wajah'}
                  </button>
                ) : (
                  <>
                    {(!enableDailyLimit || !hasAbsenMasuk) && (
                      <button
                        type="button"
                        onClick={() => handleAbsen('masuk')}
                        disabled={loading || !modelsLoaded}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98] flex justify-center items-center gap-2"
                      >
                        {loading ? 'Memproses...' : 'Absen Masuk'}
                      </button>
                    )}
                    {(!enableDailyLimit || (hasAbsenMasuk && !hasAbsenKeluar)) && (
                      <button
                        type="button"
                        onClick={() => handleAbsen('keluar')}
                        disabled={loading || !modelsLoaded}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 active:scale-[0.98] flex justify-center items-center gap-2"
                      >
                        {loading ? 'Memproses...' : 'Absen Keluar'}
                      </button>
                    )}
                    {(enableDailyLimit && hasAbsenMasuk && hasAbsenKeluar) && (
                      <div className="w-full bg-green-50 text-green-700 font-bold py-4 rounded-2xl text-center border border-green-200 shadow-sm">
                        Anda sudah menyelesaikan absensi hari ini.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Riwayat Absensi */}
          <div className="lg:col-span-3 bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl border border-white/40 flex flex-col h-[700px]">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat Kehadiran
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-medium">Belum ada data kehadiran hari ini.</p>
                </div>
              ) : (
                records.map((record) => (
                  <div key={record._id} className="group flex flex-col sm:flex-row gap-5 items-start sm:items-center p-5 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all">
                    <div className="flex gap-2 shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shadow-inner relative ring-2 ring-teal-100">
                        {record.fotoMasuk ? (
                           <img src={record.fotoMasuk} alt="Masuk" className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">N/A</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-teal-500/80 text-white text-[10px] text-center font-bold">IN</div>
                      </div>
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shadow-inner relative ring-2 ring-orange-100">
                         {record.fotoKeluar ? (
                           <img src={record.fotoKeluar} alt="Keluar" className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">N/A</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-orange-500/80 text-white text-[10px] text-center font-bold">OUT</div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate text-gray-900 group-hover:text-purple-700 transition-colors">{record.employeeName}</h3>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                         <span className="text-sm text-gray-500">
                           <strong className="text-teal-600">IN:</strong> {record.waktuMasuk ? new Date(record.waktuMasuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                         </span>
                         <span className="text-sm text-gray-500">
                           <strong className="text-orange-600">OUT:</strong> {record.waktuKeluar ? new Date(record.waktuKeluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                         </span>
                      </div>
                      {(record.lokasiMasuk || record.lokasiKeluar) && (
                        <a 
                          href={record.lokasiMasuk 
                            ? `https://www.google.com/maps?q=${record.lokasiMasuk.latitude},${record.lokasiMasuk.longitude}`
                            : `https://www.google.com/maps?q=${record.lokasiKeluar.latitude},${record.lokasiKeluar.longitude}`
                          } 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-3 inline-flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          Peta Lokasi
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
        }
      `}} />
    </div>
  );
}
