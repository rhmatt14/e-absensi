"use client";

import { useState, useEffect } from "react";

export default function AbsensiPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState({ jamMasuk: "08:00", toleransiKeterlambatan: 15 });
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, setRes] = await Promise.all([
          fetch("/api/attendance"),
          fetch("/api/settings")
        ]);
        
        const attData = await attRes.json();
        const setData = await setRes.json();

        if (setData.success && setData.data) {
          setSettings({
            jamMasuk: setData.data.jamMasuk || "08:00",
            toleransiKeterlambatan: setData.data.toleransiKeterlambatan || 15
          });
        }

        if (attData.success) {
          // Group attendance records by user and date
          const rawRecords = attData.data;
          
          const grouped: Record<string, any> = {};
          
          rawRecords.forEach((record: any) => {
            const recordDate = new Date(record.timestamp);
            const dateStr = recordDate.toDateString();
            const key = `${dateStr}_${record.employeeName}`;
            
            if (!grouped[key]) {
              grouped[key] = {
                date: recordDate,
                employeeName: record.employeeName,
                checkIn: null,
                checkOut: null,
                photo: null,
                location: null
              };
            }
            
            if (record.type === "masuk") {
              if (!grouped[key].checkIn || recordDate < grouped[key].checkIn) {
                grouped[key].checkIn = recordDate;
                grouped[key].photo = record.photo;
                grouped[key].location = record.location;
              }
            } else if (record.type === "keluar") {
              if (!grouped[key].checkOut || recordDate > grouped[key].checkOut) {
                grouped[key].checkOut = recordDate;
                if (!grouped[key].photo) grouped[key].photo = record.photo;
                if (!grouped[key].location) grouped[key].location = record.location;
              }
            }
          });

          const processedRecords = Object.values(grouped).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
          
          setRecords(processedRecords);
          setFilteredRecords(processedRecords);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilter = () => {
    if (!startDate && !endDate) {
      setFilteredRecords(records);
      return;
    }

    const start = startDate ? new Date(startDate) : new Date(0);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date(8640000000000000);
    end.setHours(23, 59, 59, 999);

    const filtered = records.filter(record => {
      return record.date >= start && record.date <= end;
    });

    setFilteredRecords(filtered);
  };

  const calculateStatus = (checkInDate: Date | null) => {
    if (!checkInDate) {
      return { text: "Belum Absen", color: "bg-red-50 text-red-700 border-red-200" };
    }

    const [hours, minutes] = settings.jamMasuk.split(":").map(Number);
    
    const allowedTime = new Date(checkInDate);
    allowedTime.setHours(hours, minutes, 0, 0);
    allowedTime.setMinutes(allowedTime.getMinutes() + settings.toleransiKeterlambatan);

    if (checkInDate > allowedTime) {
      return { text: "Terlambat", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }

    return { text: "Hadir", color: "bg-green-50 text-green-700 border-green-200" };
  };

  const handleOpenModal = (record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monitoring Absensi</h1>
        <p className="text-gray-500 mt-1">Pantau kehadiran karyawan berdasarkan filter tanggal.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* TOP SECTION: Filter */}
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Awal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 bg-white"
              />
            </div>
            <button
              onClick={handleFilter}
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Filter
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Tanggal</th>
                <th scope="col" className="px-6 py-4 font-medium">Nama Karyawan</th>
                <th scope="col" className="px-6 py-4 font-medium">Waktu Check In</th>
                <th scope="col" className="px-6 py-4 font-medium">Waktu Check Out</th>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2">Memuat data absensi...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
                  const status = calculateStatus(record.checkIn);
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.date.toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {record.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkIn ? record.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkOut ? record.checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenModal(record)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-xs rounded-lg transition-colors border border-indigo-100"
                        >
                          Cek Bukti
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data absensi ditemukan untuk rentang tanggal tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFICATION MODAL OVERLAY */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">
                Detail Bukti Kehadiran - {selectedRecord.employeeName}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left Box: Photo */}
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-700 mb-2">Foto Verifikasi</p>
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 overflow-hidden relative">
                    {selectedRecord.photo ? (
                      <img src={selectedRecord.photo} alt="Bukti Kehadiran" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">Tidak ada foto</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Box: Location */}
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-700 mb-2">Lokasi Check-in</p>
                  <div className="w-full h-48 bg-gray-200 rounded-xl border border-gray-300 flex flex-col items-center justify-center text-gray-500 mb-4 relative overflow-hidden">
                    {selectedRecord.location?.latitude && selectedRecord.location?.longitude ? (
                      <iframe 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        loading="lazy" 
                        allowFullScreen 
                        referrerPolicy="no-referrer-when-downgrade" 
                        src={`https://maps.google.com/maps?q=${selectedRecord.location.latitude},${selectedRecord.location.longitude}&z=15&output=embed`}
                      ></iframe>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">Lokasi tidak tersedia</span>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-auto">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-indigo-500 font-medium">Koordinat</span>
                    </div>
                    <p className="text-sm text-indigo-900 font-mono">
                      {selectedRecord.location?.latitude && selectedRecord.location?.longitude 
                        ? `${selectedRecord.location.latitude}, ${selectedRecord.location.longitude}`
                        : "Tidak tersedia"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
