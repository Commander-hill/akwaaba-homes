'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  ArrowRight, 
  GraduationCap, 
  Calendar, 
  Phone, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  BookOpen, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle';

export default function OnboardingPage() {
  const router = useRouter();

  // Fetch current user details to prefill known data
  const { data: userResponse, isLoading: isUserLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
  });

  const user = userResponse?.user;

  const [formData, setFormData] = useState({
    dateOfBirth: '',
    campus: 'KNUST',
    studentId: '',
    programmeOfStudy: '',
    yearOfStudy: '1',
    guardianName: '',
    guardianPhone: '',
    isStudent: true,
  });

  // Prefill existing user data when available
  useEffect(() => {
    if (user) {
      // If user profile is already fully complete and locked, route to proper dashboard
      if (user.isProfileLocked && user.dateOfBirth && user.guardianPhone) {
        const dest = user.role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant';
        router.replace(dest);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : prev.dateOfBirth,
        campus: user.campus || prev.campus,
        studentId: user.studentId || prev.studentId,
        programmeOfStudy: user.programmeOfStudy || prev.programmeOfStudy,
        yearOfStudy: user.yearOfStudy ? String(user.yearOfStudy) : prev.yearOfStudy,
        guardianName: user.guardianName || prev.guardianName,
        guardianPhone: user.guardianPhone || prev.guardianPhone,
        isStudent: user.studentType ? true : prev.isStudent,
      }));
    }
  }, [user, router]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put('/auth/profile', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Profile completed and verified!');
      const dest = user?.role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant';
      window.location.href = dest;
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile. Please try again.');
    },
  });

  const isFormValid = Boolean(
    formData.dateOfBirth &&
    formData.guardianName.trim() &&
    formData.guardianPhone.trim() &&
    (!formData.isStudent || (formData.studentId.trim() && formData.programmeOfStudy.trim()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateOfBirth) {
      toast.error('Date of birth is required for tenancy verification.');
      return;
    }
    if (!formData.guardianName.trim() || !formData.guardianPhone.trim()) {
      toast.error('Emergency contact name and phone number are required.');
      return;
    }
    if (formData.isStudent && (!formData.studentId.trim() || !formData.programmeOfStudy.trim())) {
      toast.error('Student ID and programme of study are required for campus hostel quotas.');
      return;
    }

    mutation.mutate({
      dateOfBirth: formData.dateOfBirth,
      campus: formData.isStudent ? formData.campus : null,
      studentId: formData.isStudent ? formData.studentId.trim() : null,
      programmeOfStudy: formData.isStudent ? formData.programmeOfStudy.trim() : null,
      yearOfStudy: formData.isStudent ? parseInt(formData.yearOfStudy, 10) || 1 : null,
      studentType: formData.isStudent ? 'REGULAR' : null,
      guardianName: formData.guardianName.trim(),
      guardianPhone: formData.guardianPhone.trim(),
    });
  };

  const inputClass = "w-full h-11 px-3.5 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors";
  const labelClass = "block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

  if (isUserLoading) {
    return (
      <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132]" />
        <span className="text-xs font-medium text-zinc-500">Preparing onboarding environment...</span>
      </div>
    );
  }

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Purpose-Built Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={32}
              height={32}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              try {
                await api.post('/auth/logout');
              } catch (e) {}
              localStorage.removeItem('akwaaba_access_token');
              localStorage.removeItem('akwaaba_refresh_token');
              window.location.href = '/login';
            }}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main Two-Column Editorial Body ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-start">
          
          {/* ──── Left Side: Reassurance Sticky Card (40% Desktop) ──── */}
          <div className="hidden lg:block lg:col-span-5 sticky top-12 self-start">
            <div className="relative w-full aspect-[4/5] max-h-[580px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs group bg-[#0B1510]">
              
              <Image
                src="/images/auth-bg.png"
                alt="Ayeduase and Legon hostel community"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

              <div className="absolute bottom-0 inset-x-0 p-7 text-white space-y-2.5">
                <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-300 font-semibold">
                  Profile Setup // Step 2 of 2
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Finish setting up your verified tenancy profile
                </h3>
                <p className="text-xs text-zinc-200/80 leading-relaxed font-normal">
                  Ghanaian tenancy laws and hostel management systems require emergency contact details and verified student credentials before booking rooms.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-zinc-300/80">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Access campus-specific pricing &amp; room quotas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Emergency kin registration for security compliance</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ──── Right Side: Onboarding Form (60% Desktop) ──── */}
          <div className="lg:col-span-7 w-full max-w-[520px] mx-auto lg:mx-0">
            
            <div className="space-y-6">
              
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400 mb-2">
                  Account Onboarding
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Complete your profile
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Welcome to AkwaabaHomes{user?.firstName ? `, ${user.firstName}` : ''}. Please provide the required details below to begin booking accommodation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Date of Birth */}
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input 
                    type="date" 
                    required 
                    className={inputClass} 
                    value={formData.dateOfBirth} 
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Required for legally binding digital tenancy agreements.</p>
                </div>

                {/* Student Status Toggle */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                        Are you a tertiary student?
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Unlock student discounts and hostel allocations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-0.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isStudent: true })}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        formData.isStudent 
                          ? 'bg-[#0F5132] text-white shadow-2xs' 
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isStudent: false })}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        !formData.isStudent 
                          ? 'bg-[#0F5132] text-white shadow-2xs' 
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Campus Verification Module */}
                {formData.isStudent && (
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4 animate-in fade-in">
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                      <span>Tertiary Institution Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Campus / University *</label>
                        <select 
                          required 
                          className={`${inputClass} appearance-none cursor-pointer`} 
                          value={formData.campus} 
                          onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                        >
                          <option value="KNUST">KNUST — Kwame Nkrumah University of Science and Technology</option>
                          <option value="UG">UG — University of Ghana, Legon</option>
                          <option value="UCC">UCC — University of Cape Coast</option>
                          <option value="UPSA">UPSA — University of Professional Studies, Accra</option>
                          <option value="ATU">ATU — Accra Technical University</option>
                          <option value="GIMPA">GIMPA — Greenhill, Achimota</option>
                          <option value="UMaT">UMaT — University of Mines and Technology, Tarkwa</option>
                          <option value="OTHER">Other Accredited Institution</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Student ID Number *</label>
                        <input 
                          type="text" 
                          required 
                          className={inputClass} 
                          value={formData.studentId} 
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} 
                          placeholder="e.g. 20839201" 
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Year of Study *</label>
                        <select 
                          className={`${inputClass} appearance-none cursor-pointer`} 
                          value={formData.yearOfStudy} 
                          onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                        >
                          <option value="1">Year 1 (Freshman)</option>
                          <option value="2">Year 2 (Sophomore)</option>
                          <option value="3">Year 3 (Penultimate)</option>
                          <option value="4">Year 4 (Finalist)</option>
                          <option value="5">Year 5+ (Medical/Postgrad)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Programme of Study *</label>
                        <input 
                          type="text" 
                          required 
                          className={inputClass} 
                          value={formData.programmeOfStudy} 
                          onChange={(e) => setFormData({ ...formData, programmeOfStudy: e.target.value })} 
                          placeholder="e.g. BSc. Computer Science" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Module */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                      <span>Emergency Contact / Next of Kin</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Required for resident safety and emergency notifications.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>Guardian / Kin Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        className={inputClass} 
                        value={formData.guardianName} 
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} 
                        placeholder="e.g. Samuel Mensah" 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Emergency Phone Number *</label>
                      <input 
                        type="tel" 
                        required 
                        className={inputClass} 
                        value={formData.guardianPhone} 
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} 
                        placeholder="024XXXXXXX" 
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={mutation.isPending || !isFormValid}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0F5132] cursor-pointer shadow-xs disabled:shadow-none"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Complete Profile &amp; Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>

          </div>

        </div>
      </main>

      {/* ── Subdued Institutional Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
        <div>
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Terms of Service
          </Link>
          <Link href="/help" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Help Center
          </Link>
        </div>
      </footer>

    </div>
  );
}
