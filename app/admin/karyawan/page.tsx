"use client";
import dynamic from 'next/dynamic';

const KaryawanClient = dynamic(() => import('./KaryawanClient'), {
  ssr: false, 
  loading: () => (
    <div className="min-h-screen flex items-center justify-center font-semibold text-gray-500">
      Sedang menyiapkan modul AI dan kamera...
    </div>
  )
});

export default function KaryawanPage() {
  return <KaryawanClient />;
}