"use client";

import { useState, useEffect } from "react";

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [settings, setSettings] = useState({
    jamMasuk: "08:00",
    jamPulang: "17:00",
    toleransiKeterlambatan: 15,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (res.ok && data.success) {
          setSettings({
            jamMasuk: data.data.jamMasuk || "08:00",
            jamPulang: data.data.jamPulang || "17:00",
            toleransiKeterlambatan: data.data.toleransiKeterlambatan || 15,
          });
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ text: "Pengaturan berhasil disimpan!", type: "success" });
      } else {
        setMessage({ text: data.error || "Gagal menyimpan pengaturan.", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Terjadi kesalahan server.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Jam Kerja</h1>
        <p className="text-gray-500 mt-1">Konfigurasi jam kerja dan aturan keterlambatan karyawan.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Atur Waktu Absensi</h2>
            <p className="text-sm text-gray-500">Tentukan standar operasional waktu perusahaan.</p>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {message.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jam Masuk Standar</label>
              <input
                type="time"
                required
                value={settings.jamMasuk}
                onChange={(e) => setSettings({ ...settings, jamMasuk: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jam Pulang Standar</label>
              <input
                type="time"
                required
                value={settings.jamPulang}
                onChange={(e) => setSettings({ ...settings, jamPulang: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Toleransi Keterlambatan (Menit)</label>
            <input
              type="number"
              required
              min="0"
              value={settings.toleransiKeterlambatan}
              onChange={(e) => setSettings({ ...settings, toleransiKeterlambatan: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
              placeholder="Contoh: 15"
            />
            <p className="mt-1.5 text-xs text-gray-500">Karyawan yang absen masuk setelah waktu ini dari jam standar akan ditandai Terlambat.</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 focus:ring-4 focus:ring-orange-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center ml-auto"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                "Simpan Pengaturan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
