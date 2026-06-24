"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function LaporanPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [settings, setSettings] = useState({ jamMasuk: "08:00", toleransiKeterlambatan: 15 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success && data.data) {
          setSettings({
            jamMasuk: data.data.jamMasuk || "08:00",
            toleransiKeterlambatan: data.data.toleransiKeterlambatan || 15
          });
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      }
    };
    fetchSettings();
  }, []);

  const calculateStatus = (checkInDate: Date | null) => {
    if (!checkInDate) {
      return "Belum Absen";
    }

    const [hours, minutes] = settings.jamMasuk.split(":").map(Number);
    const allowedTime = new Date(checkInDate);
    allowedTime.setHours(hours, minutes, 0, 0);
    allowedTime.setMinutes(allowedTime.getMinutes() + settings.toleransiKeterlambatan);

    if (checkInDate > allowedTime) {
      return "Terlambat";
    }

    return "Hadir";
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setMessage({ text: "Silakan pilih Tanggal Awal dan Tanggal Akhir", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/attendance");
      const attData = await res.json();

      if (!attData.success) {
        throw new Error("Gagal mengambil data absensi");
      }

      const rawRecords = attData.data;

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const grouped: Record<string, any> = {};
      
      rawRecords.forEach((record: any) => {
        const recordDate = new Date(record.timestamp);
        if (recordDate < start || recordDate > end) return;

        const dateStr = recordDate.toDateString();
        const key = `${dateStr}_${record.employeeName}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            date: recordDate,
            employeeName: record.employeeName,
            checkIn: null,
            checkOut: null
          };
        }
        
        if (record.type === "masuk") {
          if (!grouped[key].checkIn || recordDate < grouped[key].checkIn) {
            grouped[key].checkIn = recordDate;
          }
        } else if (record.type === "keluar") {
          if (!grouped[key].checkOut || recordDate > grouped[key].checkOut) {
            grouped[key].checkOut = recordDate;
          }
        }
      });

      const processedRecords = Object.values(grouped).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

      if (processedRecords.length === 0) {
        setMessage({ text: "Tidak ada data absensi untuk rentang tanggal ini.", type: "error" });
        setLoading(false);
        return;
      }

      const excelData = processedRecords.map((r: any) => {
        const status = calculateStatus(r.checkIn);
        
        return {
          "Nama": r.employeeName,
          "Tanggal": r.date.toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
          }),
          "Jam Masuk": r.checkIn ? r.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
          "Jam Keluar": r.checkOut ? r.checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
          "Status": status
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
      
      XLSX.writeFile(workbook, `Laporan_Absensi_${startDate}_to_${endDate}.xlsx`);
      
      setMessage({ text: "Laporan berhasil diunduh!", type: "success" });

    } catch (error) {
      console.error("Error exporting:", error);
      setMessage({ text: "Terjadi kesalahan saat mengexport data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-500 mt-1">Export data absensi karyawan ke format Excel.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 text-green-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Unduh Laporan Absensi</h2>
            <p className="text-gray-500 mt-1 text-sm leading-relaxed">
              Pilih rentang tanggal untuk mengunduh rekap absensi karyawan ke dalam format Excel (.xlsx).
            </p>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {message.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Awal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Memproses...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
