import Link from 'next/link';
import { Search, MapPin, Building, Star, ShieldCheck, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#111111]">
      
      {/* Full screen background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat fixed"
        style={{ 
          backgroundImage: 'url(/images/sunset-bg.png)',
          filter: 'brightness(0.6) contrast(1.15)' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[#111111]"></div>
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 font-medium text-sm text-white shadow-lg shadow-black/20">
            <span className="flex h-2 w-2 rounded-full bg-[#E06D53] animate-pulse"></span>
            The #1 Platform for Students & Landlords in Ghana
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white drop-shadow-xl">
            Find Your Perfect <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-[#5B4CFF]">Home Away From Home</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#A1A1AA] max-w-2xl mx-auto mb-12 drop-shadow-md">
            Secure, verified hostels and apartments for students. No scams, no hidden fees. Just trusted premium properties ready for you to move in.
          </p>

          {/* Quick Search Bar */}
          <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md rounded-[28px] p-3 flex flex-col md:flex-row gap-3 shadow-2xl border border-white/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-black/20 rounded-[20px] border border-white/10">
              <MapPin className="text-[#5B4CFF] w-6 h-6" />
              <input 
                type="text" 
                placeholder="Where do you want to live? (e.g., Ayeduase)" 
                className="w-full bg-transparent border-none outline-none text-white placeholder:text-[#A1A1AA] text-lg"
              />
            </div>
            <Link 
              href="/properties" 
              className="bg-[#5B4CFF] text-white px-10 py-4 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#4B3DEE] transition-all shadow-[0_0_20px_rgba(91,76,255,0.3)] shrink-0"
            >
              <Search className="w-5 h-5" />
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST FEATURES */}
      <section className="py-24 relative z-10 border-t border-white/20 dark:border-white/10 bg-white dark:bg-[#111111] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] dark:shadow-none transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 transition-colors">Why Choose AkwaabaHomes?</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg transition-colors">We provide a premium, secure, and hassle-free experience for students looking for the perfect place to stay.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="rounded-[32px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-[2px] shadow-xl shadow-[var(--primary)]/10 dark:shadow-[var(--primary)]/5 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col items-center text-center p-8 bg-white dark:bg-[#1C1A1B] rounded-[30px] h-full transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[var(--primary)]/30">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors">Verified Landlords</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">Every landlord is rigorously verified using their Ghana Card to ensure maximum security.</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-[32px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-[2px] shadow-xl shadow-[var(--primary)]/10 dark:shadow-[var(--primary)]/5 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col items-center text-center p-8 bg-white dark:bg-[#1C1A1B] rounded-[30px] h-full transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[var(--primary)]/30">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors">Premium Properties</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">From cozy single rooms to luxury apartments, find the perfect match for your budget.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-[32px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-[2px] shadow-xl shadow-[var(--primary)]/10 dark:shadow-[var(--primary)]/5 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col items-center text-center p-8 bg-white dark:bg-[#1C1A1B] rounded-[30px] h-full transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[var(--primary)]/30">
                  <Star className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors">Authentic Reviews</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">Read reviews from actual students who have completed stays at the properties.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 bg-slate-950 text-slate-400 py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">AKWAABA Homes</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap font-medium">
            <Link href="/properties" className="hover:text-white transition-colors">Browse Properties</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link 
              href="/admin/login" 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-colors font-bold"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
