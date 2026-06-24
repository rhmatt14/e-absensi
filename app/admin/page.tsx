"use client";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalKaryawan: 0,
    hadir: 0,
    terlambat: 0,
    absen: 0,
  });
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, attendanceRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/attendance"),
        ]);
        const usersData = await usersRes.json();
        const attendanceData = await attendanceRes.json();

        const employees = usersData.success
          ? usersData.data.filter((u: any) => u.role === "employee")
          : [];
        const totalKaryawan = employees.length;

        // Count today's attendance
        const todayStr = new Date().toDateString();
        const todayRecords = attendanceData.success
          ? attendanceData.data.filter(
              (a: any) => new Date(a.timestamp).toDateString() === todayStr
            )
          : [];

        const todayMasuk = todayRecords.filter((a: any) => a.type === "masuk");

        setStats({
          totalKaryawan,
          hadir: todayMasuk.length,
          terlambat: 0, // Will be implemented with work hour settings
          absen: Math.max(0, totalKaryawan - todayMasuk.length),
        });

        // Calculate table data
        const processedData = employees.map((emp: any) => {
          const empName = emp.name || emp.username;
          const empRecords = todayRecords.filter((a: any) => a.employeeName === empName);
          
          const masukRecords = empRecords.filter((a: any) => a.type === "masuk").sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const keluarRecords = empRecords.filter((a: any) => a.type === "keluar").sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          const checkIn = masukRecords.length > 0 ? new Date(masukRecords[0].timestamp) : null;
          const checkOut = keluarRecords.length > 0 ? new Date(keluarRecords[0].timestamp) : null;

          let statusText = "Tidak Hadir";
          let statusColor = "bg-red-50 text-red-700 border-red-200";

          if (checkIn && checkOut) {
            const diffMs = checkOut.getTime() - checkIn.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            statusText = `Total: ${diffHrs}j ${diffMins}m`;
            statusColor = "bg-blue-50 text-blue-700 border-blue-200";
          } else if (checkIn) {
            statusText = "Hadir";
            statusColor = "bg-green-50 text-green-700 border-green-200";
            
            // simple terlambat check (assuming > 08:00 is late)
            const hour = checkIn.getHours();
            const min = checkIn.getMinutes();
            if (hour > 8 || (hour === 8 && min > 0)) {
               statusText = "Terlambat";
               statusColor = "bg-amber-50 text-amber-700 border-amber-200";
            }
          }

          return {
            name: empName,
            checkIn: checkIn ? checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-",
            checkOut: checkOut ? checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-",
            status: statusText,
            statusColor: statusColor
          };
        });

        setTableData(processedData);
      } catch (error) {
        console.error("Gagal mengambil data dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Karyawan",
      value: stats.totalKaryawan,
      color: "bg-blue-50 text-blue-700 border-blue-100",
      iconColor: "text-blue-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Hadir Hari Ini",
      value: stats.hadir,
      color: "bg-green-50 text-green-700 border-green-100",
      iconColor: "text-green-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      color: "bg-amber-50 text-amber-700 border-amber-100",
      iconColor: "text-amber-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Tidak Hadir",
      value: stats.absen,
      color: "bg-red-50 text-red-700 border-red-100",
      iconColor: "text-red-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Ringkasan kondisi absensi hari ini.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 ${card.color} transition-shadow hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={card.iconColor}>{card.icon}</span>
            </div>
            <p className="text-3xl font-bold">
              {loading ? (
                <span className="inline-block w-10 h-8 rounded bg-current/10 animate-pulse" />
              ) : (
                card.value
              )}
            </p>
            <p className="text-sm font-medium mt-1 opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Table Absensi Hari Ini */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Absensi Hari Ini
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Data kehadiran karyawan pada hari ini.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  Nama Karyawan
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Waktu Check In
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Waktu Check Out
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-6 py-4">{row.checkIn}</td>
                    <td className="px-6 py-4">{row.checkOut}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Belum ada data kehadiran hari ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
