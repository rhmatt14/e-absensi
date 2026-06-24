"use client";

import { useEffect, useState, useMemo } from "react";
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

function formatTime(dateStr?: string): string {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(waktuMasuk?: string) {
  if (!waktuMasuk) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Belum Absen
      </span>
    );
  }

  const checkInTime = new Date(waktuMasuk);
  const lateThreshold = new Date(checkInTime);
  // Using 08:30 as the late threshold (based on dashboard)
  lateThreshold.setHours(8, 30, 0, 0);

  if (checkInTime > lateThreshold) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        Terlambat
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
      Hadir
    </span>
  );
}

export default function RiwayatAbsensiPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"semua" | "minggu" | "bulan">("semua");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
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
          // Assuming API returns all records for this user (handled by server based on role/headers)
          setRecords(attData.data || []);
        }
      } catch (err) {
        console.error("Error fetching history data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    if (filter === "semua") return records;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return records.filter((record) => {
      const recordDate = new Date(record.date);
      
      if (filter === "minggu") {
        // Calculate start of current week (Monday)
        const day = startOfToday.getDay();
        const diff = startOfToday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(startOfToday.setDate(diff));
        return recordDate >= startOfWeek;
      } 
      
      if (filter === "bulan") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return recordDate >= startOfMonth;
      }

      return true;
    });
  }, [records, filter]);

  const validRecords = filteredRecords.filter(
    (record) => record.date && !isNaN(new Date(record.date).getTime())
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-64"></div>
        <div className="bg-white rounded-xl h-64 border border-gray-100 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link 
          href="/karyawan" 
          className="p-2 rounded-full bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Kehadiran Saya</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.name ? `Menampilkan data kehadiran untuk ${user.name}` : "Menampilkan data kehadiran Anda"}
          </p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setFilter("semua")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            filter === "semua"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          Semua Data
        </button>
        <button
          onClick={() => setFilter("bulan")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            filter === "bulan"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          Bulan Ini
        </button>
        <button
          onClick={() => setFilter("minggu")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            filter === "minggu"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          Minggu Ini
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {validRecords.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Belum ada riwayat absensi</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {filter === "semua" 
                ? "Anda belum memiliki data riwayat kehadiran." 
                : `Tidak ada riwayat kehadiran untuk periode yang dipilih.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Waktu Masuk
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Waktu Pulang
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {validRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(record.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        <span className="text-sm text-gray-700 font-medium">
                          {formatTime(record.waktuMasuk)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${record.waktuKeluar ? 'bg-orange-400' : 'bg-gray-300'}`}></div>
                        <span className={`text-sm font-medium ${record.waktuKeluar ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatTime(record.waktuKeluar)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.waktuMasuk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
