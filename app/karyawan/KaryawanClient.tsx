"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Webcam from "react-webcam";
import * as faceapi from '@vladmandic/face-api';

interface UserInfo {
  name: string;
  username: string;
  role: string;
  hasFaceRegistered?: boolean;
  faceDescriptor?: number[];
}

interface AttendanceRecord {
  _id: string;
  employeeName: string;
  date: string;
  waktuMasuk?: string;
  waktuKeluar?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Skeleton loader component
function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-100 rounded w-2/3 mx-auto" />
              <div className="h-8 bg-gray-200 rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-gray-200 rounded-2xl" />
        <div className="h-14 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

export default function KaryawanDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Face Recognition States
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fetchRecords = async () => {
    try {
      const attRes = await fetch("/api/attendance", { cache: "no-store" });
      if (attRes.ok) {
        const attData = await attRes.json();
        const fetchedRecords: AttendanceRecord[] = attData.data || [];
        setRecords(fetchedRecords);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const record = fetchedRecords.find(
          (r) => new Date(r.date).getTime() === startOfDay.getTime()
        );
        if (record) {
          setTodayRecord(record);
        }
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

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
    async function fetchData() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }
        await fetchRecords();
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

    setIsScanning(true);
    setMessage({ text: "Sedang memindai wajah...", type: "info" });

    const currentDescriptor = await detectFaceFromWebcam();
    if (!currentDescriptor) {
      setMessage({ text: "Wajah tidak terdeteksi di kamera. Pastikan pencahayaan cukup.", type: "error" });
      setIsScanning(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: Array.from(currentDescriptor) }),
      });

      const data = await res.json();
      if (res.ok || data.success) {
        setUser((prev) =>
          prev ? { ...prev, hasFaceRegistered: true, faceDescriptor: Array.from(currentDescriptor) } : null
        );
        setMessage({ text: "Wajah berhasil didaftarkan!", type: "success" });
      } else {
        setMessage({ text: data.error || "Gagal mendaftarkan wajah", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan server saat mendaftarkan wajah", type: "error" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAbsen = async (type: 'masuk' | 'keluar') => {
    if (!modelsLoaded) {
      setMessage({ text: "Model pengenalan wajah sedang dimuat, mohon tunggu...", type: "info" });
      return;
    }

    setIsScanning(true);
    setMessage({ text: "Sedang memverifikasi wajah...", type: "info" });

    if (!user?.hasFaceRegistered || !user?.faceDescriptor || user.faceDescriptor.length === 0) {
      setMessage({ text: "Wajah Anda belum terdaftar. Silakan hubungi Admin.", type: "error" });
      setIsScanning(false);
      return;
    }

    const currentDescriptor = await detectFaceFromWebcam();
    if (!currentDescriptor) {
      setMessage({ text: "Wajah tidak terdeteksi di kamera. Pastikan pencahayaan cukup.", type: "error" });
      setIsScanning(false);
      return;
    }

    const savedDescriptor = new Float32Array(user.faceDescriptor);
    const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);

    if (distance > 0.55) {
      setMessage({ text: "Wajah tidak cocok, dilarang titip absen!", type: "error" });
      setIsScanning(false);
      return;
    }

    setMessage({ text: "Wajah terverifikasi. Sedang mendapatkan lokasi...", type: "info" });

    if (!navigator.geolocation) {
      setMessage({ text: "Geolocation tidak didukung oleh browser Anda.", type: "error" });
      setIsScanning(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const photoSrc = webcamRef.current?.getScreenshot();

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
          if (data.success || res.ok) {
            setMessage({ text: `Absen ${type} berhasil dicatat!`, type: "success" });
            await fetchRecords();
          } else {
            setMessage({ text: data.error || `Gagal menyimpan absen ${type}`, type: "error" });
          }
        } catch (err) {
          setMessage({ text: "Terjadi kesalahan sistem saat menghubungi server", type: "error" });
        } finally {
          setIsScanning(false);
        }
      },
      (err) => {
        console.error(err);
        setMessage({ text: "Gagal mendapatkan lokasi. Pastikan Anda mengizinkan akses lokasi pada browser.", type: "error" });
        setIsScanning(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const getStatus = () => {
    if (!todayRecord || !todayRecord.waktuMasuk) {
      return { label: "Belum Absen", color: "text-gray-500", bg: "bg-gray-100", dot: "bg-gray-400" };
    }

    const checkInTime = new Date(todayRecord.waktuMasuk);
    const lateThreshold = new Date(checkInTime);
    lateThreshold.setHours(8, 30, 0, 0);

    if (checkInTime > lateThreshold) {
      return { label: "Terlambat", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" };
    }

    return { label: "Hadir", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" };
  };

  const status = getStatus();

  // Calculate attendance states
  const todayDateStr = new Date().toDateString();
  const userRecords = records.filter(
    (r) => user && r.employeeName === user.name && new Date(r.date).toDateString() === todayDateStr
  );
  const hasAbsenMasuk = userRecords.length > 0 && !!userRecords[0].waktuMasuk;
  const hasAbsenKeluar = userRecords.length > 0 && !!userRecords[0].waktuKeluar;

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header / Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()},{" "}
          <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            {user?.name || "Karyawan"}
          </span>
          ! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">{formatDate()}</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Status Hari Ini
          </h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="mx-5 border-t border-gray-100" />

        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-4 py-5 text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-xl bg-teal-50">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Jam Masuk</p>
            <p className={`text-xl font-bold ${todayRecord?.waktuMasuk ? "text-gray-900" : "text-gray-300"}`}>
              {formatTime(todayRecord?.waktuMasuk)}
            </p>
          </div>

          <div className="px-4 py-5 text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-xl bg-orange-50">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Jam Pulang</p>
            <p className={`text-xl font-bold ${todayRecord?.waktuKeluar ? "text-gray-900" : "text-gray-300"}`}>
              {formatTime(todayRecord?.waktuKeluar)}
            </p>
          </div>

          <div className="px-4 py-5 text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-50">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Durasi</p>
            <p className={`text-xl font-bold ${todayRecord?.waktuMasuk && todayRecord?.waktuKeluar ? "text-gray-900" : "text-gray-300"}`}>
              {todayRecord?.waktuMasuk && todayRecord?.waktuKeluar
                ? (() => {
                    const diffMs = new Date(todayRecord.waktuKeluar).getTime() - new Date(todayRecord.waktuMasuk).getTime();
                    const hours = Math.floor(diffMs / 3600000);
                    const mins = Math.floor((diffMs % 3600000) / 60000);
                    return `${hours}j ${mins}m`;
                  })()
                : "--:--"}
            </p>
          </div>
        </div>
      </div>

      {/* Verifikasi Wajah / Camera Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Kamera Kehadiran</h2>
          {!modelsLoaded && (
            <span className="text-xs font-medium text-teal-600 animate-pulse bg-teal-50 px-2 py-1 rounded-md">
              Memuat AI...
            </span>
          )}
          {modelsLoaded && isScanning && (
            <span className="text-xs font-medium text-amber-600 animate-pulse bg-amber-50 px-2 py-1 rounded-md">
              Memindai Wajah...
            </span>
          )}
        </div>

        <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video relative flex items-center justify-center border border-gray-200">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className={`w-full h-full object-cover ${!modelsLoaded ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
            videoConstraints={{ facingMode: "user" }}
          />
          {!modelsLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Menyiapkan Kamera...</p>
            </div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
            message.type === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Explicit CTA Buttons */}
      <div className="flex flex-col gap-3">
        {!user?.hasFaceRegistered ? (
          <button
            onClick={handleDaftarWajah}
            disabled={isScanning || !modelsLoaded}
            className="flex w-full items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            Daftarkan Wajah
          </button>
        ) : hasAbsenMasuk && hasAbsenKeluar ? (
          <div className="flex items-center justify-center py-4 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-200 select-none">
            Anda sudah menyelesaikan absensi hari ini.
          </div>
        ) : !hasAbsenMasuk ? (
          <button
            onClick={() => handleAbsen('masuk')}
            disabled={isScanning || !modelsLoaded}
            className="flex w-full items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Absen Masuk
          </button>
        ) : (
          <button
            onClick={() => handleAbsen('keluar')}
            disabled={isScanning || !modelsLoaded}
            className="flex w-full items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-orange-600 hover:to-red-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Absen Pulang
          </button>
        )}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/karyawan/riwayat"
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors">
              <svg className="w-4.5 h-4.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Riwayat</p>
              <p className="text-[11px] text-gray-400">Lihat semua</p>
            </div>
          </div>
        </Link>

        <Link
          href="/karyawan/izin"
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-50 group-hover:bg-cyan-100 transition-colors">
              <svg className="w-4.5 h-4.5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Izin & Cuti</p>
              <p className="text-[11px] text-gray-400">Ajukan izin</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
