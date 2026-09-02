'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      if (response.status === 200) {
        const userRole = response.data.user.role;
        if (userRole === 'ADMIN') {
          window.location.href = '/admin/dashboard';
        } else {
          // If a standard user tries to login via admin portal
          await api.post('/auth/logout');
          setError('Unauthorized. This portal is for administrative personnel only.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D12] relative overflow-hidden">
      {/* High-security background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-zinc-900/30 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      <div className="max-w-md w-full p-8 relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-zinc-700/60 shadow-xs mb-6">
            <Image src="/logo.png" alt="Akwaaba Homes" width={64} height={64} className="w-full h-full object-cover" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin<span className="text-[#198754]">Command</span></h1>
          <p className="text-slate-400 mt-2 font-mono text-sm tracking-widest uppercase">Restricted Access</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Authority Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-12 pr-4 py-3.5 border border-slate-800 rounded-xl bg-[#111] text-white focus:ring-1 focus:ring-[#0F5132] focus:border-[#0F5132] outline-none transition-all placeholder:text-slate-600"
                placeholder="admin@system.local"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Security Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-12 pr-4 py-3.5 border border-slate-800 rounded-xl bg-[#111] text-white focus:ring-1 focus:ring-[#0F5132] focus:border-[#0F5132] outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#0F5132] hover:bg-[#0A3D24] text-white transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Authenticate <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-12 text-center border-t border-slate-800 pt-8">
          <p className="text-xs text-slate-600 font-mono">
            UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED AND MONITORED.
          </p>
        </div>
      </div>
    </div>
  );
}
