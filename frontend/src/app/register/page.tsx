'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, ArrowLeft, Loader2, Building, Phone, Calendar, Globe, MapPin, GraduationCap, CheckCircle, Wrench } from 'lucide-react';
import api from '@/lib/axios';
import PassportUpload from '@/components/PassportUpload';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

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
  
  const [formData, setFormData] = useState({
    role: '',
    isStudent: false,
    avatarUrl: '',
    
    // Basic Info
    firstName: '',
    lastName: '',
    otherNames: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    guardianName: '',
    guardianPhone: '',
    
    // School Info
    campus: '',
    studentId: '',
    dateOfAdmission: '',
    programmeOfStudy: '',
    yearOfStudy: '',
    studentType: '',
    
    // Security
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const errorRef = useRef<HTMLDivElement>(null);

  const triggerError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && !formData.role) {
      triggerError('Please select an account type.');
      return;
    }
    
    if (currentStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        triggerError('Please fill in your name and email address.');
        return;
      }
      if (!formData.phoneNumber.trim() || !formData.gender || !formData.nationality.trim()) {
        triggerError('Please fill in your Phone Number, Gender, and Country/Nationality.');
        return;
      }
      if (formData.role === 'TENANT') {
        if (!formData.dateOfBirth || !formData.guardianName.trim() || !formData.guardianPhone.trim()) {
          triggerError('Please fill in your Date of Birth and Guardian / Emergency Contact details.');
          return;
        }
      }
    }

    if (currentStep === 3 && formData.isStudent) {
      if (!formData.campus || !formData.studentId.trim() || !formData.dateOfAdmission || !formData.programmeOfStudy.trim() || !formData.yearOfStudy || !formData.studentType) {
        triggerError('Please fill in all mandatory school information fields.');
        return;
      }
    }

    if (currentStep === 2 && (!formData.isStudent || formData.role === 'LANDLORD' || formData.role === 'CARETAKER')) {
      setCurrentStep(4);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    if (currentStep === 4 && (!formData.isStudent || formData.role === 'LANDLORD' || formData.role === 'CARETAKER')) {
      setCurrentStep(2);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.acceptTerms) {
      triggerError('You must agree to the Terms and Conditions.');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      triggerError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/\d/.test(formData.password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      triggerError('Password must include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      triggerError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', formData);
      toast.success('Registration successful! Please sign in.');
      router.push('/login?registered=true');
    } catch (err: any) {
      triggerError(err.response?.data?.message || 'Failed to register. Please try again.');
      setIsLoading(false);
    }
  };

  const totalSteps = 4;
  const progressPercentage = ((currentStep) / totalSteps) * 100;

  const inputClass = "block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-all";
  const labelClass = "block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5";

  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-4 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Verifying existing session...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 transition-colors">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-[#0F5132] dark:text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-950 dark:text-white">Already Signed In</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                You are currently logged in as <span className="font-bold text-zinc-900 dark:text-white">{sessionData.firstName || sessionData.email}</span> ({sessionData.role}).
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => redirectByRole(sessionData)}
                className="w-full py-3 px-4 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Go to {roleTitle}</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
                className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Sign out &amp; create new account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 transition-colors">
      
      

      <div className="w-full max-w-2xl z-10 animate-in fade-in duration-200 mt-12 mb-12">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              Create your Akwaaba<span className="text-[#0F5132] dark:text-[#198754]">Homes</span> Account
            </h1>
          </Link>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Verified student accommodation, digital leases, and direct landlord connections.</p>
        </div>

        <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xs relative">
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">Step {currentStep} of {totalSteps}</span>
              <span className="text-xs font-bold text-[#0F5132] dark:text-[#198754]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#0F5132] dark:bg-[#198754] rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>

          {error && (
            <div ref={errorRef} className="mb-6 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium flex items-start gap-3">
              <div className="mt-0.5"><Lock className="w-4 h-4" /></div>
              {error}
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">How will you use AkwaabaHomes?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, role: 'TENANT' }); setError(''); }}
                  className={`p-6 rounded-[20px] border-[1.5px] text-left transition-all ${formData.role === 'TENANT' ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'TENANT' ? 'bg-[#5B4CFF] text-white shadow-[0_0_15px_rgba(91,76,255,0.4)]' : 'bg-[#1C1A1B] text-[#A1A1AA]'}`}>
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">Tenant</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">I want to find and book premium hostels or apartments.</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, role: 'LANDLORD', isStudent: false }); setError(''); }}
                  className={`p-6 rounded-[20px] border-[1.5px] text-left transition-all ${formData.role === 'LANDLORD' ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'LANDLORD' ? 'bg-[#5B4CFF] text-white shadow-[0_0_15px_rgba(91,76,255,0.4)]' : 'bg-[#1C1A1B] text-[#A1A1AA]'}`}>
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">Landlord</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">I want to list my properties, track earnings, and manage bookings.</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, role: 'CARETAKER', isStudent: false }); setError(''); }}
                  className={`p-6 rounded-[20px] border-[1.5px] text-left transition-all ${formData.role === 'CARETAKER' ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'CARETAKER' ? 'bg-[#5B4CFF] text-white shadow-[0_0_15px_rgba(91,76,255,0.4)]' : 'bg-[#1C1A1B] text-[#A1A1AA]'}`}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">Caretaker / Staff</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">I manage facility operations, tickets, check-ins, and compound notices.</p>
                </button>
              </div>

              {formData.role === 'TENANT' && (
                <div className="mt-8 p-6 bg-[#2A2A2B]/40 rounded-[20px] border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-[#5B4CFF]" /> Are you currently a University Student?</h4>
                  <div className="flex gap-4">
                    <button onClick={() => setFormData({...formData, isStudent: true})} className={`flex-1 py-3.5 rounded-2xl border-[1.5px] font-bold transition-all ${formData.isStudent ? 'border-[#5B4CFF] bg-[#5B4CFF]/10 text-white' : 'border-white/10 bg-transparent text-[#A1A1AA] hover:border-white/30'}`}>Yes</button>
                    <button onClick={() => setFormData({...formData, isStudent: false})} className={`flex-1 py-3.5 rounded-2xl border-[1.5px] font-bold transition-all ${!formData.isStudent ? 'border-[#5B4CFF] bg-[#5B4CFF]/10 text-white' : 'border-white/10 bg-transparent text-[#A1A1AA] hover:border-white/30'}`}>No</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: BASIC INFO & PASSPORT */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-[28px] font-extrabold text-white tracking-tight">Basic Information</h2>
              <p className="text-[#A1A1AA] text-sm mb-6">Tell us a bit about yourself (Passport picture is optional).</p>
              
              {/* Passport Upload */}
              <div className="mb-8">
                <PassportUpload 
                  currentUrl={formData.avatarUrl}
                  onUploadSuccess={(url) => setFormData({ ...formData, avatarUrl: url })}
                  onUploadError={(err) => setError(err)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" required className={inputClass} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" required className={inputClass} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Other Name(s) (Optional)</label>
                  <input type="text" className={inputClass} value={formData.otherNames} onChange={(e) => setFormData({...formData, otherNames: e.target.value})} placeholder="Middle name" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Email Address *</label>
                  <input type="email" required className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                </div>
                
                <div>
                  <label className={labelClass}>Mobile Number *</label>
                  <input type="tel" required className={inputClass} value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder="054..." />
                </div>
                <div>
                  <label className={labelClass}>Gender *</label>
                  <select required className={`${inputClass} appearance-none`} value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                    <option value="" className="bg-[#1C1A1B]">Select Gender</option>
                    <option value="MALE" className="bg-[#1C1A1B]">Male</option>
                    <option value="FEMALE" className="bg-[#1C1A1B]">Female</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Country / Nationality *</label>
                  <input type="text" required className={inputClass} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} placeholder="Ghana" />
                </div>

                {formData.role === 'TENANT' && (
                  <>
                    <div>
                      <label className={labelClass}>Date of Birth *</label>
                      <input type="date" required className={inputClass} value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} style={{ colorScheme: 'dark' }} />
                    </div>
                    <div>
                      <label className={labelClass}>Guardian Name *</label>
                      <input type="text" required className={inputClass} value={formData.guardianName} onChange={(e) => setFormData({...formData, guardianName: e.target.value})} placeholder="Jane Doe" />
                    </div>
                    <div>
                      <label className={labelClass}>Guardian Phone *</label>
                      <input type="tel" required className={inputClass} value={formData.guardianPhone} onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})} placeholder="054..." />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SCHOOL INFO (Only for Students) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-[28px] font-extrabold text-white tracking-tight flex items-center gap-2"><GraduationCap className="text-[#5B4CFF]"/> School Information *</h2>
              <p className="text-[#A1A1AA] text-sm mb-6">All student credentials are mandatory for room allocation and verification.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Campus / University *</label>
                  <select required className={`${inputClass} appearance-none`} value={formData.campus} onChange={(e) => setFormData({...formData, campus: e.target.value})}>
                    <option value="" className="bg-[#1C1A1B]">Select Campus</option>
                    <option value="UCC" className="bg-[#1C1A1B]">University of Cape Coast (UCC)</option>
                    <option value="KNUST" className="bg-[#1C1A1B]">KNUST</option>
                    <option value="UG" className="bg-[#1C1A1B]">University of Ghana, Legon</option>
                    <option value="UPSA" className="bg-[#1C1A1B]">UPSA</option>
                    <option value="UDS" className="bg-[#1C1A1B]">UDS</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Student ID / Index Number *</label>
                  <input type="text" required className={`${inputClass} uppercase`} value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} placeholder="Index Number" />
                </div>
                <div>
                  <label className={labelClass}>Date of Admission *</label>
                  <input type="date" required className={inputClass} value={formData.dateOfAdmission} onChange={(e) => setFormData({...formData, dateOfAdmission: e.target.value})} style={{ colorScheme: 'dark' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Programme of Study *</label>
                  <input type="text" required className={inputClass} value={formData.programmeOfStudy} onChange={(e) => setFormData({...formData, programmeOfStudy: e.target.value})} placeholder="e.g. BSc Computer Science" />
                </div>
                <div>
                  <label className={labelClass}>Year of Study *</label>
                  <select required className={`${inputClass} appearance-none`} value={formData.yearOfStudy} onChange={(e) => setFormData({...formData, yearOfStudy: e.target.value})}>
                    <option value="" className="bg-[#1C1A1B]">Select Level</option>
                    <option value="100" className="bg-[#1C1A1B]">Level 100</option>
                    <option value="200" className="bg-[#1C1A1B]">Level 200</option>
                    <option value="300" className="bg-[#1C1A1B]">Level 300</option>
                    <option value="400" className="bg-[#1C1A1B]">Level 400</option>
                    <option value="500" className="bg-[#1C1A1B]">Level 500+</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Student Type *</label>
                  <select required className={`${inputClass} appearance-none`} value={formData.studentType} onChange={(e) => setFormData({...formData, studentType: e.target.value})}>
                    <option value="" className="bg-[#1C1A1B]">Select Type</option>
                    <option value="UNDERGRADUATE" className="bg-[#1C1A1B]">Undergraduate</option>
                    <option value="POSTGRADUATE" className="bg-[#1C1A1B]">Postgraduate</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PASSWORD & SUBMIT */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-[28px] font-extrabold text-white tracking-tight">Secure your account</h2>
              <p className="text-[#A1A1AA] text-sm mb-6">Create a strong password.</p>
              
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" required className={inputClass} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                  
                  {/* Password Requirements Checklist */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-[#A1A1AA]">
                    <div className={`flex items-center gap-1.5 ${formData.password.length >= 8 ? 'text-emerald-400 font-bold' : ''}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${formData.password.length >= 8 ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                      <span>Min. 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 'text-emerald-400 font-bold' : ''}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                      <span>Uppercase & lowercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/\d/.test(formData.password) ? 'text-emerald-400 font-bold' : ''}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${/\d/.test(formData.password) ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                      <span>At least 1 number</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-emerald-400 font-bold' : ''}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                      <span>Special character (@#$!%)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input type="password" required className={inputClass} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" />
                </div>

                <div className="flex items-start gap-3 p-4 bg-[#2A2A2B]/40 rounded-2xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    className="mt-1 w-4 h-4 rounded bg-[#1C1A1B] text-[#5B4CFF] focus:ring-[#5B4CFF] border-white/10" 
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                  />
                  <label htmlFor="terms" className="text-sm text-[#A1A1AA] leading-tight">
                    I agree to the <Link href="/terms" className="text-white font-bold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-white font-bold hover:underline">Privacy Policy</Link>.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-10 flex justify-between gap-4 pt-6 border-t border-white/10">
            {currentStep > 1 ? (
              <button onClick={handleBack} type="button" className="px-4 py-2.5 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-xs cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div></div>}
            
            {currentStep < 4 ? (
              <button onClick={handleNext} type="button" className="px-6 py-2.5 rounded-xl font-bold bg-[#0F5132] text-white hover:bg-[#0A3D24] transition-colors flex items-center gap-2 text-xs cursor-pointer">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2.5 rounded-xl font-bold bg-[#0F5132] text-white hover:bg-[#0A3D24] transition-colors flex items-center gap-2 text-xs cursor-pointer disabled:opacity-70">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Create Account
              </button>
            )}
          </div>

        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Already have an account? <Link href="/login" className="font-bold text-[#0F5132] dark:text-[#198754] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
