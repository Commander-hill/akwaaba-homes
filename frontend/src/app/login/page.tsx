'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.user.role === 'ADMIN') {
        window.location.href = '/dashboard/admin';
      } else if (response.data.user.role === 'LANDLORD') {
        window.location.href = '/dashboard/landlord';
      } else {
        // Tenant
        if (!response.data.user.studentId) {
          window.location.href = '/onboarding';
        } else {
          window.location.href = '/dashboard/tenant';
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#111111]">
      {/* Full screen background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url(/images/sunset-bg.png)',
          filter: 'brightness(0.7) contrast(1.1)' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md z-10 mx-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="bg-white/85 backdrop-blur-2xl rounded-[28px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/60 ring-1 ring-black/5">

          {/* Logo Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(91,70,229,0.3)] mb-3 ring-2 ring-white">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #E06D53)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} className="font-extrabold text-xl tracking-tight">
              AkwaabaHomes
            </span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-slate-600 text-sm">
              Don&apos;t have an account? <Link href="/register" className="text-[#5B4CFF] font-bold hover:underline transition-all">Sign up today</Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200/80 rounded-xl text-sm font-medium flex items-start gap-3">
              <div className="mt-0.5"><Lock className="w-4 h-4 text-red-500" /></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Address */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required 
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5B4CFF] focus:ring-2 focus:ring-[#5B4CFF]/20 outline-none transition-all" 
                  placeholder="john@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5B4CFF] focus:ring-2 focus:ring-[#5B4CFF]/20 outline-none transition-all" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-1 pb-2">
              <div className="flex items-center">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-100 border-slate-300 text-[#5B4CFF] focus:ring-[#5B4CFF]" 
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-bold text-[#5B4CFF] hover:text-[#4B3DEE] transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-white bg-[#5B4CFF] hover:bg-[#4B3DEE] font-bold text-[15px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B4CFF] transition-all shadow-[0_8px_25px_rgba(91,76,255,0.35)] active:scale-[0.99] disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            
          </form>

        </div>
      </div>
      
      {/* Brand logo bottom left */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10">
          <Image src="/logo.png" alt="Akwaaba Homes" width={40} height={40} className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-bold text-sm drop-shadow">Akwaaba Homes</span>
      </div>
    </div>
  );
}
