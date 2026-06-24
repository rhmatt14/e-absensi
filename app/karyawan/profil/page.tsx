"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  username: string;
  name: string;
  role: string;
}

export default function ProfilSayaPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="bg-white rounded-2xl h-[500px] border border-gray-200 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link 
          href="/karyawan" 
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-500 mt-1">Informasi digital ID Card Anda</p>
        </div>
      </div>

      {/* Digital ID Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-32 w-full"></div>
        
        {/* Avatar & Basic Info */}
        <div className="flex flex-col items-center px-6 pb-8 relative">
          {/* Overlapping Avatar */}
          <div className="-mt-16 mb-4 w-32 h-32 rounded-full bg-white p-1.5 shadow-md">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center text-5xl font-bold shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 text-center">{user?.name}</h2>
          <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
            {user?.role === "user" ? "Karyawan" : user?.role}
          </span>
        </div>

        {/* Detailed Info List */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Nama Lengkap
              </label>
              <div className="text-base font-medium text-gray-900">
                {user?.name}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Username / Email
              </label>
              <div className="text-base font-medium text-gray-900">
                {user?.username}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Jabatan
              </label>
              <div className="text-base font-medium text-gray-900 capitalize">
                {user?.role === "user" ? "Karyawan" : user?.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
