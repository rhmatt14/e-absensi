"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserInfo {
  name: string;
  username: string;
  role: string;
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
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, attRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/attendance"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          const records: AttendanceRecord[] = attData.data || [];

          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);

          // Find today's specific record
          const record = records.find(
            (r) => new Date(r.date).getTime() === startOfDay.getTime()
          );

          if (record) {
            setTodayRecord(record);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  // Button States
  const isMasukDisabled = !!todayRecord?.waktuMasuk;
  const isPulangDisabled = !todayRecord?.waktuMasuk || !!todayRecord?.waktuKeluar;

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

      {/* Explicit CTA Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Button Masuk */}
        {isMasukDisabled ? (
          <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm font-bold border border-gray-200 cursor-not-allowed select-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Masuk Selesai
          </div>
        ) : (
          <Link
            href="/karyawan/absensi?type=masuk"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-700 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Absen Masuk
          </Link>
        )}

        {/* Button Pulang */}
        {isPulangDisabled ? (
          <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm font-bold border border-gray-200 cursor-not-allowed select-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {todayRecord?.waktuKeluar ? "Pulang Selesai" : "Belum Masuk"}
          </div>
        ) : (
          <Link
            href="/karyawan/absensi?type=pulang"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:from-orange-600 hover:to-red-600 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Absen Pulang
          </Link>
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
