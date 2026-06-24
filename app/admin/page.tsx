"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [enableDailyLimit, setEnableDailyLimit] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    role: "employee",
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data user", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      if (data.success) {
        setAttendance(data.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data absensi", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setEnableDailyLimit(data.data.enableDailyLimit);
      }
    } catch (error) {
      console.error("Gagal mengambil pengaturan", error);
    }
  };

  const toggleDailyLimit = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableDailyLimit: !enableDailyLimit }),
      });
      const data = await res.json();
      if (data.success) {
        setEnableDailyLimit(data.data.enableDailyLimit);
      }
    } catch (error) {
      console.error("Gagal mengubah pengaturan", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    fetchAttendance();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Akun berhasil dibuat!", type: "success" });
        setFormData({ username: "", name: "", password: "", role: "employee" });
        fetchUsers();
      } else {
        setMessage({ text: data.error || "Gagal membuat akun", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan sistem", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${name}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Akun ${name} berhasil dihapus.`, type: "success" });
        fetchUsers();
      } else {
        setMessage({
          text: data.error || "Gagal menghapus akun",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({ text: "Terjadi kesalahan sistem", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAttendance = async (name: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus SEMUA riwayat absen untuk ${name}?`,
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/attendance/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `Riwayat absen ${name} berhasil dihapus.`,
          type: "success",
        });
      } else {
        setMessage({
          text: data.error || "Gagal menghapus riwayat absen",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({ text: "Terjadi kesalahan sistem", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Fungsi untuk memproses data absensi menjadi total jam kerja
  const getWorkHours = () => {
    const workHoursRecords: any[] = [];

    for (let i = 0; i < attendance.length; i++) {
      const current = attendance[i];

      if (current.type === "keluar") {
        const waktuKeluar = new Date(current.timestamp);

        const matchedMasuk = attendance.find((r, index) => {
          const isMasuk = r.type === "masuk";
          const isSameUser = r.employeeName === current.employeeName;
          const isSameDay =
            new Date(r.timestamp).toDateString() === waktuKeluar.toDateString();

          return index > i && isMasuk && isSameUser && isSameDay;
        });

        if (matchedMasuk) {
          const waktuMasuk = new Date(matchedMasuk.timestamp);
          const selisihMs = waktuKeluar.getTime() - waktuMasuk.getTime(); // Hasil dalam milidetik

          const totalJam = Math.floor(selisihMs / (1000 * 60 * 60));
          const sisaMenit = Math.floor(
            (selisihMs % (1000 * 60 * 60)) / (1000 * 60),
          );

          workHoursRecords.push({
            id: current._id,
            name: current.employeeName,
            tanggal: waktuKeluar.toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            jamMasuk: waktuMasuk.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            jamKeluar: waktuKeluar.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            durasi: `${totalJam} jam ${sisaMenit} menit`,
          });
        }
      }
    }

    return workHoursRecords;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Dashboard Administrator
            </h1>
            <p className="text-gray-500">
              Kelola akun karyawan dan sistem absensi
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors"
            >
              Lihat Absensi
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {/* Form Buat User */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
              <h2 className="text-lg font-bold mb-4 text-gray-800">
                Buat Akun Baru
              </h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">
                    Username Login
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="employee">Karyawan (Hanya Absen)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                  </select>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? "Menyimpan..." : "Buat Akun"}
                </button>
              </form>
            </div>

            {/* Pengaturan Sistem */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
              <h2 className="text-lg font-bold mb-4 text-gray-800">
                Pengaturan Sistem
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    Batasi Absen Harian
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mencegah user absen berulang kali di hari yang sama.
                  </p>
                </div>
                <button
                  onClick={toggleDailyLimit}
                  disabled={settingsLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enableDailyLimit ? "bg-blue-600" : "bg-gray-200"} disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableDailyLimit ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Daftar User */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Daftar Pengguna Sistem
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-sm">
                    <th className="py-3 px-2 font-medium">Nama / Username</th>
                    <th className="py-3 px-2 font-medium">Role</th>
                    <th className="py-3 px-2 font-medium">Tanggal Dibuat</th>
                    <th className="py-3 px-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-gray-500"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u._id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <p className="font-semibold text-gray-800">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {u.role === "admin" ? "Admin" : "Karyawan"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("id-ID")
                            : "-"}
                        </td>
                        <td className="py-3 px-2 text-right space-x-2">
                          <button
                            onClick={() => handleClearAttendance(u.name)}
                            className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-semibold hover:bg-orange-100 transition-colors"
                          >
                            Hapus Absen
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                          >
                            Hapus Akun
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Kotak Tabel Rekap Jam Kerja Karyawan */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6">
          <h2 className="text-lg font-bold mb-4 text-gray-800">
            Rekap Total Jam Kerja Karyawan
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="py-3 px-2 font-medium">Nama Karyawan</th>
                  <th className="py-3 px-2 font-medium">Tanggal</th>
                  <th className="py-3 px-2 font-medium">Jam Masuk</th>
                  <th className="py-3 px-2 font-medium">Jam Keluar</th>
                  <th className="py-3 px-2 font-medium">Total Jam Kerja</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {getWorkHours().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Belum ada data rekap jam kerja harian.
                    </td>
                  </tr>
                ) : (
                  getWorkHours().map((rec) => (
                    <tr
                      key={rec.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2 font-semibold text-gray-800">
                        {rec.name}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{rec.tanggal}</td>
                      <td className="py-3 px-2 text-green-600 font-medium">
                        {rec.jamMasuk}
                      </td>
                      <td className="py-3 px-2 text-red-600 font-medium">
                        {rec.jamKeluar}
                      </td>
                      <td className="py-3 px-2 font-bold text-blue-600">
                        {rec.durasi}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
