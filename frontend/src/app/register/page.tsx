'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, ArrowLeft, Loader2, Building, Phone, Calendar, Globe, MapPin, GraduationCap, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';
import PassportUpload from '@/components/PassportUpload';

export default function RegisterPage() {
  const router = useRouter();
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

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && !formData.role) {
      setError('Please select an account type.');
      return;
    }
    
    if (currentStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        setError('Please fill in your name and email address.');
        return;
      }
      if (!formData.phoneNumber.trim() || !formData.gender || !formData.dateOfBirth || !formData.nationality.trim() || !formData.guardianName.trim() || !formData.guardianPhone.trim()) {
        setError('Please fill in all mandatory personal details (Phone, Gender, Date of Birth, Country, and Emergency Contact).');
        return;
      }
    }

    if (currentStep === 3 && formData.isStudent) {
      if (!formData.campus || !formData.studentId.trim() || !formData.dateOfAdmission || !formData.programmeOfStudy.trim() || !formData.yearOfStudy || !formData.studentType) {
        setError('Please fill in all mandatory school information fields.');
        return;
      }
    }

    if (currentStep === 2 && (!formData.isStudent || formData.role === 'LANDLORD')) {
      setCurrentStep(4);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep === 4 && (!formData.isStudent || formData.role === 'LANDLORD')) {
      setCurrentStep(2);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.acceptTerms) {
      setError('You must agree to the Terms and Conditions.');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', formData);
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
      setIsLoading(false);
    }
  };

  const totalSteps = 4;
  const progressPercentage = ((currentStep) / totalSteps) * 100;

  const inputClass = "block w-full p-3.5 bg-[#2A2A2B]/60 border border-white/5 rounded-2xl text-white placeholder-[#71717A] focus:bg-[#2A2A2B] focus:border-[#5B4CFF] focus:ring-1 focus:ring-[#5B4CFF] outline-none transition-all";
  const labelClass = "block text-xs font-bold text-white uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#111111]">
      
      {/* Full screen background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url(/images/sunset-bg.png)',
          filter: 'brightness(0.7) contrast(1.1)' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80"></div>
      </div>

      <div className="w-full max-w-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-12 mb-12">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              AkwaabaHomes.
            </h1>
          </Link>
          <p className="mt-2 text-[#A1A1AA] font-medium">Create your premium housing account.</p>
        </div>

        <div className="bg-[#1C1A1B]/80 backdrop-blur-xl rounded-[28px] p-6 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden">
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">Step {currentStep} of {totalSteps}</span>
              <span className="text-xs font-bold text-[#5B4CFF]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-[#2A2A2B] rounded-full overflow-hidden">
              <div className="h-full bg-[#5B4CFF] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(91,76,255,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium flex items-start gap-3">
              <div className="mt-0.5"><Lock className="w-4 h-4" /></div>
              {error}
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-[28px] font-extrabold text-white tracking-tight">How will you use AkwaabaHomes?</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, role: 'TENANT' }); setError(''); }}
                  className={`p-6 rounded-[20px] border-[1.5px] text-left transition-all ${formData.role === 'TENANT' ? 'border-[#5B4CFF] bg-[#5B4CFF]/10' : 'border-white/10 hover:border-white/30 bg-[#2A2A2B]/40'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'TENANT' ? 'bg-[#5B4CFF] text-white shadow-[0_0_15px_rgba(91,76,255,0.4)]' : 'bg-[#1C1A1B] text-[#A1A1AA]'}`}>
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">I am a Tenant</h3>
                  <p className="text-sm text-[#A1A1AA]">I want to find and book premium hostels or apartments.</p>
                </button>

                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, role: 'LANDLORD', isStudent: false }); setError(''); }}
                  className={`p-6 rounded-[20px] border-[1.5px] text-left transition-all ${formData.role === 'LANDLORD' ? 'border-[#5B4CFF] bg-[#5B4CFF]/10' : 'border-white/10 hover:border-white/30 bg-[#2A2A2B]/40'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'LANDLORD' ? 'bg-[#5B4CFF] text-white shadow-[0_0_15px_rgba(91,76,255,0.4)]' : 'bg-[#1C1A1B] text-[#A1A1AA]'}`}>
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">I am a Landlord</h3>
                  <p className="text-sm text-[#A1A1AA]">I want to list my properties and manage bookings.</p>
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
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" required className={inputClass} value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className={labelClass}>Country / Nationality *</label>
                  <input type="text" required className={inputClass} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} placeholder="Ghana" />
                </div>
                <div>
                  <label className={labelClass}>{formData.role === 'LANDLORD' ? 'Emergency Contact Name *' : 'Guardian Name *'}</label>
                  <input type="text" required className={inputClass} value={formData.guardianName} onChange={(e) => setFormData({...formData, guardianName: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className={labelClass}>{formData.role === 'LANDLORD' ? 'Emergency Contact Phone *' : 'Guardian Phone *'}</label>
                  <input type="tel" required className={inputClass} value={formData.guardianPhone} onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})} placeholder="054..." />
                </div>
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
              <button onClick={handleBack} type="button" className="px-6 py-3.5 rounded-2xl font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div></div>}
            
            {currentStep < 4 ? (
              <button onClick={handleNext} type="button" className="px-8 py-3.5 rounded-2xl font-bold bg-[#5B4CFF] text-white hover:bg-[#4B3DEE] shadow-[0_0_20px_rgba(91,76,255,0.3)] transition-all flex items-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3.5 rounded-2xl font-bold bg-white text-black hover:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-70">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Create Account
              </button>
            )}
          </div>

        </div>

        <p className="mt-8 text-center text-sm font-medium text-[#A1A1AA]">
          Already have an account? <Link href="/login" className="text-white font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
