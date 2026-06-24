"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface IzinRecord {
  _id: string;
  employeeName: string;
  jenisIzin: "Sakit" | "Izin" | "Cuti";
  tanggal: string;
  alasan: string;
  status: "Pending" | "Disetujui" | "Ditolak";
  createdAt: string;
}

export default function IzinCutiPage() {
  const router = useRouter();
  const [records, setRecords] = useState<IzinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [jenisIzin, setJenisIzin] = useState("Izin");
  const [tanggal, setTanggal] = useState("");
  const [alasan, setAlasan] = useState("");

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/izin");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/izin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenisIzin, tanggal, alasan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengirim pengajuan.");
      } else {
        setSuccessMsg("Pengajuan berhasil dikirim!");
        setJenisIzin("Izin");
        setTanggal("");
        setAlasan("");
        fetchRecords(); // Refresh the history
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disetujui":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Disetujui
          </span>
        );
      case "Ditolak":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Izin & Cuti</h1>
          <p className="text-sm text-gray-500 mt-1">Ajukan dan pantau status izin atau cuti Anda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Form Pengajuan Baru</h2>
            </div>
            
            <div className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="jenisIzin" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jenis Izin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="jenisIzin"
                      value={jenisIzin}
                      onChange={(e) => setJenisIzin(e.target.value)}
                      className="block w-full rounded-xl border border-gray-300 bg-white text-gray-900 px-4 py-2.5 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors appearance-none"
                      required
                    >
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Cuti">Cuti</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tanggal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="tanggal"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 bg-white text-gray-900 px-4 py-2.5 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="alasan" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Alasan / Keterangan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="alasan"
                    rows={4}
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder="Jelaskan alasan izin/cuti Anda..."
                    className="block w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-700 hover:to-cyan-700 active:scale-[0.98] ${
                    submitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Kirim Pengajuan
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Riwayat Pengajuan</h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {records.length} Total
              </span>
            </div>

            <div className="p-0 flex-1 bg-gray-50/30">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex space-x-4 bg-white p-4 rounded-xl border border-gray-100">
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-900 font-medium text-lg mb-1">Belum ada riwayat pengajuan</h3>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Anda belum pernah mengajukan izin atau cuti. Pengajuan yang Anda buat akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <div key={record._id} className="p-5 hover:bg-white transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{record.jenisIzin}</span>
                          <span className="text-xs text-gray-400">&bull;</span>
                          <span className="text-sm text-gray-500">{formatDate(record.tanggal)}</span>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        "{record.alasan}"
                      </p>
                      <div className="mt-3 text-xs text-gray-400">
                        Diajukan pada {new Date(record.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
