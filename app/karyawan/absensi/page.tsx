"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LocationData {
  latitude: number;
  longitude: number;
}

function AbsensiCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const absenType = searchParams.get("type") || "masuk"; // default to masuk if not provided
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        if (err.name === "NotAllowedError") {
          setCameraError("Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.");
        } else if (err.name === "NotFoundError") {
          setCameraError("Kamera tidak ditemukan pada perangkat ini.");
        } else {
          setCameraError("Gagal mengakses kamera: " + err.message);
        }
      }
    }
    startCamera();

    // Cleanup: stop camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung oleh browser ini.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda.");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("Informasi lokasi tidak tersedia.");
            break;
          case err.TIMEOUT:
            setLocationError("Permintaan lokasi timeout. Silakan coba lagi.");
            break;
          default:
            setLocationError("Terjadi kesalahan saat mendapatkan lokasi.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Capture photo & submit
  const handleSubmit = useCallback(async () => {
    if (!cameraReady || !location || submitting) return;

    setSubmitting(true);
    setMessage(null);

    try {
      // Capture frame from video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("Video atau canvas tidak tersedia.");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal mendapatkan context canvas.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoBase64 = canvas.toDataURL("image/jpeg", 0.8);

      // Send to API
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: photoBase64,
          latitude: location.latitude,
          longitude: location.longitude,
          type: absenType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Stop camera immediately on success
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setMessage({
          text: absenType === "masuk"
            ? "✅ Absen Masuk berhasil dicatat!"
            : "✅ Absen Pulang berhasil dicatat!",
          type: "success",
        });

        // Redirect to dashboard after brief delay
        setTimeout(() => {
          router.refresh();
          router.push("/karyawan");
        }, 1500);
      } else {
        setMessage({ text: data.error || "Gagal mencatat absensi.", type: "error" });
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setMessage({ text: "Terjadi kesalahan: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [cameraReady, location, submitting, absenType, router]);

  const isReady = cameraReady && location;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Verifikasi Absen {absenType === "masuk" ? "Masuk" : "Pulang"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Ambil foto dan catat lokasi Anda untuk {absenType === "masuk" ? "memulai" : "mengakhiri"} jam kerja.
        </p>
      </div>

      {/* Absen Type Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
        absenType === "masuk"
          ? "bg-teal-50 text-teal-700 border border-teal-200"
          : "bg-orange-50 text-orange-700 border border-orange-200"
      }`}>
        <span className={`w-2 h-2 rounded-full ${absenType === "masuk" ? "bg-teal-500" : "bg-orange-500"}`} />
        Mode: Absen {absenType === "masuk" ? "Masuk" : "Pulang"}
      </div>

      {/* Camera Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Video Feed */}
        <div className="relative bg-gray-900 aspect-video">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 mb-3">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-red-400 text-sm font-medium">{cameraError}</p>
            </div>
          ) : !cameraReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-sm">Membuka kamera...</p>
            </div>
          ) : null}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!cameraReady || cameraError ? "invisible" : ""}`}
          />

          {/* Live indicator */}
          {cameraReady && !cameraError && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] text-white font-medium">LIVE</span>
            </div>
          )}
        </div>

        {/* Location Info */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
              location ? "bg-emerald-50" : locationError ? "bg-red-50" : "bg-gray-50"
            }`}>
              <svg className={`w-4.5 h-4.5 ${
                location ? "text-emerald-500" : locationError ? "text-red-500" : "text-gray-400"
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Lokasi</p>
              {locationError ? (
                <p className="text-sm text-red-600 font-medium">{locationError}</p>
              ) : location ? (
                <p className="text-sm text-gray-800 font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Mencari lokasi...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.type === "success" ? (
            <svg className="w-5 h-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isReady || submitting || message?.type === "success"}
        className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
          absenType === "masuk"
            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-700"
            : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-orange-600 hover:to-red-600"
        }`}
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <span className="text-xl">📸</span>
            {absenType === "masuk" ? "Ambil Foto & Absen Masuk" : "Ambil Foto & Absen Pulang"}
          </>
        )}
      </button>

      {/* Back to dashboard */}
      <button
        onClick={() => router.push("/karyawan")}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Dashboard
      </button>
    </div>
  );
}

export default function AbsensiKaryawanPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <AbsensiCameraContent />
    </Suspense>
  );
}
