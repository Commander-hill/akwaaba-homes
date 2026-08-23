import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found | AkwaabaHomes',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center space-y-8 animate-in fade-in">
        {/* Glowing 404 */}
        <div className="relative">
          <div className="text-[9rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 text-[9rem] font-black text-indigo-500/10 blur-2xl leading-none select-none">
            404
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Page not found</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            The hostel listing or page you&apos;re looking for doesn&apos;t exist, was moved, or the link is incorrect.
          </p>
        </div>

        {/* Suggestions */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-slate-300 text-left space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
            You might be looking for:
          </p>
          <Link href="/properties" className="flex items-center gap-2 hover:text-white transition-colors">
            <Search className="w-4 h-4 text-indigo-400" /> Browse all hostel listings
          </Link>
          <Link href="/login" className="flex items-center gap-2 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 text-indigo-400" /> Sign in to your account
          </Link>
          <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
            <Home className="w-4 h-4 text-indigo-400" /> Return to homepage
          </Link>
        </div>

        {/* CTA Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/25"
        >
          <Home className="w-4 h-4" /> Back to AkwaabaHomes
        </Link>
      </div>
    </div>
  );
}
