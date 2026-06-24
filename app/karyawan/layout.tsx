import EmployeeSidebar from "@/app/components/EmployeeSidebar";

export const metadata = {
  title: "Karyawan - E-Absensi",
  description: "Portal karyawan sistem e-absensi untuk absensi, riwayat, izin & cuti, dan profil.",
};

export default function KaryawanLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeSidebar />
      {/* pt-14 on mobile for the fixed header bar, md:pt-0 to reset on desktop */}
      <main className="pt-14 md:pt-0 md:pl-64 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
