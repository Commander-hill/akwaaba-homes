'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  Building2, 
  GraduationCap, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  ShieldCheck,
  Check
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();

  // Check if user is already logged in
  const { data: sessionData, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data?.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const redirectByRole = (user: any) => {
    if (user.role === 'ADMIN') {
      window.location.href = '/admin/dashboard';
    } else if (user.role === 'LANDLORD') {
      window.location.href = '/dashboard/landlord';
    } else if (user.role === 'CARETAKER' || user.role === 'STAFF') {
      window.location.href = '/dashboard/caretaker';
    } else {
      if (user.isStudent && !user.studentId) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard/tenant';
      }
    }
  };

  useEffect(() => {
    if (sessionData) {
      redirectByRole(sessionData);
    }
  }, [sessionData]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    role: 'TENANT',
    isStudent: true,
    avatarUrl: '',
    
    // Basic Info
    firstName: '',
    lastName: '',
    otherNames: '',
    email: '',
    phoneNumber: '',
    gender: 'MALE',
    dateOfBirth: '',
    nationality: 'Ghanaian',
    guardianName: '',
    guardianPhone: '',
    
    // School Info
    campus: 'KNUST',
    studentId: '',
    dateOfAdmission: '',
    programmeOfStudy: '',
    yearOfStudy: '100',
    studentType: 'UNDERGRADUATE',
    
    // Security
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const errorRef = useRef<HTMLDivElement>(null);

  const triggerError = (msg: string) => {
    setError(msg);
    toast.error(msg);
    if (errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextStep = () => {
    setError('');

    // Step 1 Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      triggerError('Please enter your first and last name.');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      triggerError('Please provide a valid Ghanaian phone number (e.g. 054xxxxxxx).');
      return;
    }
    if (!formData.gender || !formData.nationality.trim()) {
      triggerError('Please specify your gender and nationality.');
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = () => {
    setError('');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Step 2 Validations
    if (!formData.email.trim()) {
      triggerError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'TENANT') {
      if (!formData.dateOfBirth) {
        triggerError('Date of birth is required for tenant verification.');
        setIsLoading(false);
        return;
      }
      if (formData.isStudent) {
        if (!formData.guardianName.trim() || !formData.guardianPhone.trim()) {
          triggerError('Please provide emergency guardian contact details.');
          setIsLoading(false);
          return;
        }
        if (!formData.campus || !formData.studentId.trim() || !formData.dateOfAdmission || !formData.programmeOfStudy.trim()) {
          triggerError('Please complete your university and student details.');
          setIsLoading(false);
          return;
        }
      }
    }

    if (formData.password.length < 8) {
      triggerError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      triggerError('Passwords do not match. Please re-enter your password.');
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      triggerError('You must agree to the Terms of Service and Privacy Policy.');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', formData);
      toast.success('Registration successful! Please sign in.');
      router.push('/login?registered=true');
    } catch (err: any) {
      triggerError(err.response?.data?.message || 'Failed to complete registration. Please try again.');
      setIsLoading(false);
    }
  };

  const isStep1Valid = Boolean(
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.phoneNumber.trim() &&
    formData.gender &&
    formData.nationality.trim()
  );

  const isStep2Valid = Boolean(
    formData.email.trim() &&
    formData.password.length >= 8 &&
    formData.confirmPassword.length >= 8 &&
    formData.password === formData.confirmPassword &&
    formData.acceptTerms &&
    (formData.role !== 'TENANT' ||
      (Boolean(formData.dateOfBirth) &&
        (!formData.isStudent ||
          (Boolean(formData.campus) &&
            Boolean(formData.studentId.trim()) &&
            Boolean(formData.yearOfStudy) &&
            Boolean(formData.dateOfAdmission) &&
            Boolean(formData.programmeOfStudy.trim()) &&
            Boolean(formData.guardianName.trim()) &&
            Boolean(formData.guardianPhone.trim())))))
  );

  const inputClass = "w-full h-11 px-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition";
  const labelClass = "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";

  // Active Session Fallback
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token')) {
    return (
      <div className="-mt-16 -mb-16 md:mb-0 min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0E1210] text-[#242925] dark:text-zinc-100 p-6 space-y-4">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Verifying session...</p>
      </div>
    );
  }

  if (sessionData) {
    const roleTitle = sessionData.role === 'LANDLORD' 
      ? 'Landlord Dashboard' 
      : sessionData.role === 'ADMIN' 
      ? 'Admin Hub' 
      : (sessionData.role === 'CARETAKER' || sessionData.role === 'STAFF')
      ? 'Operations Hub' 
      : 'Tenant Dashboard';

    return (
      <div className="-mt-16 -mb-16 md:mb-0 min-h-screen flex items-center justify-center bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-white p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You are signed in as{' '}
              <span className="font-bold text-zinc-950 dark:text-white">
                {sessionData.firstName || sessionData.email}
              </span>
              .
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <span>Continue to {roleTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post('/auth/logout');
                } catch (e) {}
                localStorage.removeItem('akwaaba_access_token');
                localStorage.removeItem('akwaaba_refresh_token');
                window.location.reload();
              }}
              className="w-full h-11 inline-flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 rounded-xl transition cursor-pointer"
            >
              Sign out &amp; create new account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-zinc-100 antialiased overflow-hidden">
      
      {/* ──── LEFT COLUMN: BRAND VISUAL HERO (52% Desktop, Full Bleed) ──── */}
      <div className="relative hidden lg:block flex-1 min-h-screen lg:h-screen overflow-hidden">
        <Image
          src="/images/auth-partnership.jpg"
          alt="Connecting trusted Ghanaian landlords & verified residents"
          fill
          sizes="55vw"
          className="object-cover object-center transform hover:scale-[1.01] transition-transform duration-1000 ease-out"
          priority
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

        {/* Top-Left Floating Action */}
        <div className="absolute top-8 left-8 z-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition shadow-xs cursor-pointer group"
          >
            <span>Already registered? Sign in</span>
            <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Bottom Overlay Content */}
        <div className="absolute bottom-0 inset-x-0 p-10 xl:p-14 text-white space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span>AKWAABA • VERIFIED PARTNERSHIP</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
            Connecting trusted landlords &amp; verified residents
          </h2>

          <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed max-w-lg font-normal">
            Digital tenancy agreements, protected escrow payouts, and verified Ghana Card identification uniting property owners and residents across Ghana.
          </p>

          {/* Trust Markers */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-300 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Escrow Protection
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Ghana Card Verified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> KNUST • UG • UCC • ATU
            </span>
          </div>
        </div>
      </div>

      {/* ──── RIGHT COLUMN: REGISTRATION FORM (48% Desktop, 100% Mobile) ──── */}
      <div className="w-full lg:w-[48%] xl:w-[44%] min-h-screen lg:h-screen lg:overflow-y-auto flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-white dark:bg-[#0E1210] lg:border-l border-zinc-200/80 dark:border-zinc-800/80 relative z-10 shrink-0">
        
        {/* Top Header: Brand + Theme Toggle + Sign In */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
                Ghana PropTech
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href="/login" 
              className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-8 sm:py-10 max-w-lg w-full mx-auto space-y-6">
          
          {/* Header & Step Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                Step {currentStep} of 2 &bull; {currentStep === 1 ? 'Personal Profile' : 'Credentials & Verification'}
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-400">
                {currentStep === 1 ? '50%' : '100%'}
              </span>
            </div>
            
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0F5132] dark:bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: currentStep === 1 ? '50%' : '100%' }}
              />
            </div>

            <div className="pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                Create your account
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                {currentStep === 1 
                  ? 'Select your role and provide your basic personal details.' 
                  : 'Set your secure password and university enrollment information.'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <AlertBanner
              ref={errorRef}
              type="error"
              message={error}
            />
          )}

          {/* ──── STEP 1: Role Selection & Personal Information ──── */}
          {currentStep === 1 && (
            <div className="space-y-5">
              
              {/* Role Cards */}
              <div className="space-y-1.5">
                <label className={labelClass}>How will you use AkwaabaHomes? *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Tenant / Student Card */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'TENANT' })}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.role === 'TENANT'
                        ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-[#0F5132]'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2.5">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-950 dark:text-white">
                      Tenant &amp; Student
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      Find and book verified campus hostels or residential apartments.
                    </p>
                  </button>

                  {/* Landlord Card */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'LANDLORD', isStudent: false })}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.role === 'LANDLORD'
                        ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-[#0F5132]'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-950 dark:text-white">
                      Landlord &amp; Host
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      List properties, manage room units, and receive rent payouts.
                    </p>
                  </button>

                </div>
              </div>

              {/* Student Enrollment Toggle (If Tenant) */}
              {formData.role === 'TENANT' && (
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                        University Student?
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Access campus hostel quotas and student rates
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isStudent: true })}
                      className={`px-3 py-1 rounded-md font-bold text-xs transition-colors cursor-pointer ${
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
                      className={`px-3 py-1 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                        !formData.isStudent 
                          ? 'bg-[#0F5132] text-white shadow-2xs' 
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input 
                    type="text" 
                    required 
                    className={inputClass} 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} 
                    placeholder="e.g. Kwame" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input 
                    type="text" 
                    required 
                    className={inputClass} 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                    placeholder="e.g. Mensah" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Other Names (Optional)</label>
                  <input 
                    type="text" 
                    className={inputClass} 
                    value={formData.otherNames} 
                    onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })} 
                    placeholder="e.g. Osei" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input 
                    type="tel" 
                    required 
                    className={inputClass} 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} 
                    placeholder="054XXXXXXX" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender *</label>
                  <select 
                    required 
                    className={`${inputClass} appearance-none cursor-pointer`} 
                    value={formData.gender} 
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nationality *</label>
                  <input 
                    type="text" 
                    required 
                    className={inputClass} 
                    value={formData.nationality} 
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} 
                    placeholder="Ghanaian" 
                  />
                </div>
              </div>

              {/* Continue Action */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={handleNextStep}
                  disabled={!isStep1Valid}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Continue to Credentials
                </Button>
              </div>

            </div>
          )}

          {/* ──── STEP 2: Credentials & Verification Information ──── */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address */}
              <div>
                <label className={labelClass}>Email Address *</label>
                <input 
                  type="email" 
                  required 
                  autoComplete="email" 
                  className={inputClass} 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="e.g. kwame@st.ug.edu.gh or name@gmail.com" 
                />
              </div>

              {/* Tenant Specific: Date of Birth & Guardian */}
              {formData.role === 'TENANT' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className={labelClass}>Date of Birth *</label>
                    <input 
                      type="date" 
                      required 
                      className={inputClass} 
                      value={formData.dateOfBirth} 
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
                    />
                  </div>

                  {/* Student Campus Verification Fields */}
                  {formData.isStudent && (
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3.5">
                      <div className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                        <span>Student Enrollment Verification</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <option value="UPSA">UPSA — University of Professional Studies</option>
                            <option value="ATU">ATU — Accra Technical University</option>
                            <option value="UDS">UDS — University for Development Studies</option>
                            <option value="OTHER">Other Tertiary Institution</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>Student ID / Index No *</label>
                          <input 
                            type="text" 
                            required 
                            className={inputClass} 
                            value={formData.studentId} 
                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} 
                            placeholder="e.g. 20849201" 
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Year of Study *</label>
                          <select 
                            required 
                            className={`${inputClass} appearance-none cursor-pointer`} 
                            value={formData.yearOfStudy} 
                            onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                          >
                            <option value="100">Level 100 (Freshman)</option>
                            <option value="200">Level 200</option>
                            <option value="300">Level 300</option>
                            <option value="400">Level 400</option>
                            <option value="500">Postgraduate / Masters</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>Date of Admission *</label>
                          <input 
                            type="date" 
                            required 
                            className={inputClass} 
                            value={formData.dateOfAdmission} 
                            onChange={(e) => setFormData({ ...formData, dateOfAdmission: e.target.value })} 
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Degree / Programme *</label>
                          <input 
                            type="text" 
                            required 
                            className={inputClass} 
                            value={formData.programmeOfStudy} 
                            onChange={(e) => setFormData({ ...formData, programmeOfStudy: e.target.value })} 
                            placeholder="e.g. Computer Science" 
                          />
                        </div>

                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <div>
                            <label className={labelClass}>Guardian / Emergency Contact *</label>
                            <input 
                              type="text" 
                              required 
                              className={inputClass} 
                              value={formData.guardianName} 
                              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} 
                              placeholder="Parent or Guardian Name" 
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Guardian Phone Number *</label>
                            <input 
                              type="tel" 
                              required 
                              className={inputClass} 
                              value={formData.guardianPhone} 
                              onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} 
                              placeholder="054XXXXXXX" 
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Password *</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      autoComplete="new-password" 
                      className={`${inputClass} pr-10`} 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      placeholder="Min. 8 characters" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      required 
                      autoComplete="new-password" 
                      className={`${inputClass} pr-10`} 
                      value={formData.confirmPassword} 
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                      placeholder="Re-enter password" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="pt-1">
                <label className="inline-flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    required 
                    checked={formData.acceptTerms} 
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })} 
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#0F5132] focus:ring-[#0F5132] accent-[#0F5132] cursor-pointer" 
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="font-bold text-[#0F5132] dark:text-emerald-400 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="font-bold text-[#0F5132] dark:text-emerald-400 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBackStep}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  isLoading={isLoading}
                  disabled={isLoading || !isStep1Valid || !isStep2Valid}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="flex-1"
                >
                  Complete Registration
                </Button>
              </div>

            </form>
          )}

          {/* Bottom Switch to Sign In */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </div>

        </div>

        {/* Bottom Footer */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <span>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana</span>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-white transition">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-white transition">Privacy</Link>
            <span>•</span>
            <Link href="/support" className="hover:text-zinc-950 dark:hover:text-white transition">Support</Link>
          </div>
        </div>

      </div>

    </div>
  );
}
