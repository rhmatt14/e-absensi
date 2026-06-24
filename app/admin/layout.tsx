import AdminSidebar from "@/app/components/AdminSidebar";

export const metadata = {
  title: "Admin - E-Absensi",
  description: "Panel administrasi sistem e-absensi untuk mengelola karyawan, absensi, dan pengaturan.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="md:pl-64 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
