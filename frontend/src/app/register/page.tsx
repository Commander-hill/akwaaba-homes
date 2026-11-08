'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Check,
  Lock,
  AlertCircle,
  Circle,
  Phone,
  Mail,
  Gift,
  Tag,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import PassportUpload from '@/components/PassportUpload';
import { getImageUrl } from '@/lib/utils';

interface AppliedPromoInfo {
  valid: boolean;
  code: string;
  type: 'CAMPUS_PROMO' | 'AMBASSADOR';
  campus: string;
  campusName: string;
  title: string;
  benefit: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}

interface GhanaCarrierInfo {
  carrier: 'MTN' | 'Telecel' | 'AT' | 'Glo';
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  label: string;
}

function detectGhanaCarrier(rawPhone: string): GhanaCarrierInfo | null {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;
  if (local.startsWith('233')) {
    local = '0' + local.slice(3);
  }

  if (local.length < 3) return null;
  const prefix3 = local.slice(0, 3);

  // MTN Ghana: 024, 025, 053, 054, 055, 059
  if (['024', '025', '053', '054', '055', '059'].includes(prefix3)) {
    return {
      carrier: 'MTN',
      label: 'MTN MoMo',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
      badgeColor: 'text-amber-800 dark:text-amber-300',
      badgeBorder: 'border-amber-300/80 dark:border-amber-800'
    };
  }

  // Telecel Ghana: 020, 050
  if (['020', '050'].includes(prefix3)) {
    return {
      carrier: 'Telecel',
      label: 'Telecel Cash',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
      badgeColor: 'text-rose-800 dark:text-rose-300',
      badgeBorder: 'border-rose-300/80 dark:border-rose-800'
    };
  }

  // AT Ghana (AirtelTigo): 027, 057, 026, 056
  if (['027', '057', '026', '056'].includes(prefix3)) {
    return {
      carrier: 'AT',
      label: 'AT Money',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
      badgeColor: 'text-blue-800 dark:text-blue-300',
      badgeBorder: 'border-blue-300/80 dark:border-blue-800'
    };
  }

  // Glo Ghana: 023
  if (['023'].includes(prefix3)) {
    return {
      carrier: 'Glo',
      label: 'Glo',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
      badgeColor: 'text-emerald-800 dark:text-emerald-300',
      badgeBorder: 'border-emerald-300/80 dark:border-emerald-800'
    };
  }

  return null;
}

function formatGhanaianPhone(input: string): string {
  if (!input) return '';
  const isPlus = input.trim().startsWith('+');
  const digits = input.replace(/\D/g, '');

  if (isPlus || digits.startsWith('233')) {
    let clean = digits.startsWith('233') ? digits.slice(3) : digits;
    if (clean.length > 9) clean = clean.slice(0, 9);
    
    if (clean.length === 0) return '+233 ';
    if (clean.length <= 2) return `+233 ${clean}`;
    if (clean.length <= 5) return `+233 ${clean.slice(0, 2)} ${clean.slice(2)}`;
    return `+233 ${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
  }

  let clean = digits;
  if (clean.length > 10) clean = clean.slice(0, 10);

  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
}

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
  const [emailCheckStatus, setEmailCheckStatus] = useState<'IDLE' | 'CHECKING' | 'AVAILABLE' | 'EXISTS'>('IDLE');
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  
  const REGISTRATION_DRAFT_KEY = 'akwaaba_registration_draft_v1';

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
    acceptTerms: false,

    // Optional Referral / Campus Ambassador Code
    promoCode: ''
  });

  const [showPromoField, setShowPromoField] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState('');

  const verifyPromo = async (codeToVerify?: string) => {
    const code = (codeToVerify || promoInput).trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a referral or promo code.');
      return;
    }
    setIsVerifyingPromo(true);
    setPromoError('');
    try {
      const res = await api.get('/auth/verify-promo', { params: { code } });
      if (res.data?.valid) {
        setAppliedPromo(res.data);
        setFormData((prev) => ({ ...prev, promoCode: res.data.code }));
        setPromoInput(res.data.code);
        setShowPromoField(true);
        toast.success(`Promo code ${res.data.code} applied!`);
      } else {
        setPromoError(res.data?.message || 'Invalid or unrecognized promo code.');
      }
    } catch (err: any) {
      setPromoError(err.response?.data?.message || `Code "${code}" is unrecognized or has expired.`);
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    setFormData((prev) => ({ ...prev, promoCode: '' }));
    toast.success('Referral code removed.');
  };

  // Check URL query parameters for ?ref=... or ?promo=... or ?referral=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('promo') || params.get('referral') || params.get('code');
      if (refParam && refParam.trim()) {
        const clean = refParam.trim().toUpperCase();
        setPromoInput(clean);
        setShowPromoField(true);
        verifyPromo(clean);
      }
    } catch (e) {
      // Ignore URL parsing error
    }
  }, []);

  // Restore saved registration draft upon page refresh / reload
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(REGISTRATION_DRAFT_KEY) || localStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            // Keep passwords empty for security
            password: '',
            confirmPassword: '',
          }));
          if (parsed.currentStep && typeof parsed.currentStep === 'number') {
            setCurrentStep(parsed.currentStep);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore registration draft:', e);
    }
  }, []);

  // Save registration draft on every change so page refreshes never wipe user input or uploaded avatar
  useEffect(() => {
    try {
      const { password, confirmPassword, ...safeDraft } = formData;
      const payload = JSON.stringify({ ...safeDraft, currentStep });
      sessionStorage.setItem(REGISTRATION_DRAFT_KEY, payload);
      localStorage.setItem(REGISTRATION_DRAFT_KEY, payload);
    } catch (e) {
      // ignore quota errors
    }
  }, [formData, currentStep]);

  // Debounced real-time email availability verification
  useEffect(() => {
    const rawEmail = formData.email ? formData.email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      setEmailCheckStatus('IDLE');
      setEmailCheckMessage('');
      return;
    }

    setEmailCheckStatus('CHECKING');
    setEmailCheckMessage('');

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/auth/check-email', { params: { email: rawEmail } });
        if (res.data?.available) {
          setEmailCheckStatus('AVAILABLE');
          setEmailCheckMessage('Email is available');
        } else if (res.data?.exists) {
          setEmailCheckStatus('EXISTS');
          setEmailCheckMessage('An account with this email already exists.');
        } else {
          setEmailCheckStatus('IDLE');
          setEmailCheckMessage('');
        }
      } catch (err: any) {
        if (err.response?.status === 409 || err.response?.data?.exists) {
          setEmailCheckStatus('EXISTS');
          setEmailCheckMessage('An account with this email already exists.');
        } else {
          // If network error or rate limit, fallback to IDLE so user is never blocked
          setEmailCheckStatus('IDLE');
          setEmailCheckMessage('');
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.email]);

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
    const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      triggerError('Please provide a valid 10-digit Ghanaian phone number (e.g. 054 123 4567).');
      return;
    }
    if (!formData.gender || !formData.nationality.trim()) {
      triggerError('Please specify your gender and nationality.');
      return;
    }
    if (formData.role === 'TENANT' && !formData.dateOfBirth) {
      triggerError('Date of birth is required for tenant verification.');
      return;
    }
    if (!formData.avatarUrl || !formData.avatarUrl.trim()) {
      triggerError('Please upload your profile photo to continue.');
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewStep = () => {
    setError('');

    if (!formData.email.trim()) {
      triggerError('Please enter a valid email address.');
      return;
    }

    if (emailCheckStatus === 'EXISTS') {
      triggerError('An account with this email already exists. Please sign in or use a different email.');
      return;
    }

    if (formData.role === 'TENANT' && formData.isStudent) {
      if (!formData.guardianName.trim() || formData.guardianPhone.replace(/\D/g, '').length < 9) {
        triggerError('Please provide valid emergency guardian contact details (10-digit Ghanaian phone number).');
        return;
      }
      if (!formData.campus || !formData.studentId.trim() || !formData.dateOfAdmission || !formData.programmeOfStudy.trim()) {
        triggerError('Please complete your university and student details.');
        return;
      }
    }

    if (formData.password.length < 8) {
      triggerError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      triggerError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Final Validations
    if (!formData.avatarUrl || !formData.avatarUrl.trim()) {
      triggerError('Please upload your profile photo to complete registration.');
      setIsLoading(false);
      setCurrentStep(1);
      return;
    }

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
      try {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
        localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      } catch (e) {}
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
    formData.phoneNumber.replace(/\D/g, '').length >= 9 &&
    formData.gender &&
    formData.nationality.trim() &&
    formData.avatarUrl && formData.avatarUrl.trim() &&
    (formData.role !== 'TENANT' || Boolean(formData.dateOfBirth))
  );

  const isStep2Valid = Boolean(
    formData.email.trim() &&
    emailCheckStatus !== 'EXISTS' &&
    formData.password.length >= 8 &&
    formData.confirmPassword.length >= 8 &&
    formData.password === formData.confirmPassword &&
    (formData.role !== 'TENANT' ||
      !formData.isStudent ||
      (Boolean(formData.campus) &&
        Boolean(formData.studentId.trim()) &&
        Boolean(formData.yearOfStudy) &&
        Boolean(formData.dateOfAdmission) &&
        Boolean(formData.programmeOfStudy.trim()) &&
        Boolean(formData.guardianName.trim()) &&
        formData.guardianPhone.replace(/\D/g, '').length >= 9))
  );

  const campusLabels: Record<string, string> = {
    KNUST: 'KNUST — Kwame Nkrumah Univ. of Science & Tech.',
    UG: 'UG — University of Ghana, Legon',
    UCC: 'UCC — University of Cape Coast',
    UPSA: 'UPSA — Univ. of Professional Studies',
    ATU: 'ATU — Accra Technical University',
    UDS: 'UDS — Univ. for Development Studies',
    OTHER: 'Other Tertiary Institution',
  };

  const fullNameDisplay = [formData.firstName, formData.otherNames, formData.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  // Real-time password security & strength evaluation
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password || '';
    const hasMinLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasNumber) score += 1;
    if (hasUpper) score += 1;
    if (hasLower && (hasSpecial || pwd.length >= 10)) score += 1;

    let label = 'Too short';
    let colorClass = 'text-zinc-400';
    let barColor = 'bg-zinc-200 dark:bg-zinc-800';

    if (pwd.length === 0) {
      score = 0;
      label = '';
    } else if (score <= 1) {
      label = 'Weak';
      colorClass = 'text-rose-500 font-bold';
      barColor = 'bg-rose-500';
    } else if (score === 2) {
      label = 'Fair';
      colorClass = 'text-amber-500 font-bold';
      barColor = 'bg-amber-500';
    } else if (score === 3) {
      label = 'Good';
      colorClass = 'text-emerald-500 font-bold';
      barColor = 'bg-emerald-500';
    } else if (score >= 4) {
      label = 'Strong';
      colorClass = 'text-[#047857] dark:text-emerald-400 font-extrabold';
      barColor = 'bg-[#047857] dark:bg-emerald-400';
    }

    const isMatch = Boolean(
      formData.confirmPassword &&
      pwd &&
      formData.confirmPassword === pwd
    );
    const isMismatch = Boolean(
      formData.confirmPassword &&
      pwd &&
      formData.confirmPassword !== pwd
    );

    return {
      hasMinLength,
      hasNumber,
      hasUpper,
      hasLower,
      hasSpecial,
      score,
      label,
      colorClass,
      barColor,
      isMatch,
      isMismatch
    };
  }, [formData.password, formData.confirmPassword]);

  // Ghanaian phone number auto-formatting & carrier detection
  const handlePhoneChange = (raw: string, field: 'phoneNumber' | 'guardianPhone') => {
    const formatted = formatGhanaianPhone(raw);
    setFormData((prev) => ({ ...prev, [field]: formatted }));
  };

  const userCarrier = useMemo(() => detectGhanaCarrier(formData.phoneNumber), [formData.phoneNumber]);
  const guardianCarrier = useMemo(() => detectGhanaCarrier(formData.guardianPhone), [formData.guardianPhone]);

  const isUserPhoneValid = useMemo(() => {
    const digits = formData.phoneNumber.replace(/\D/g, '');
    return digits.length === 10 || (digits.startsWith('233') && digits.length === 12);
  }, [formData.phoneNumber]);

  const isGuardianPhoneValid = useMemo(() => {
    const digits = formData.guardianPhone.replace(/\D/g, '');
    return digits.length === 10 || (digits.startsWith('233') && digits.length === 12);
  }, [formData.guardianPhone]);

  const inputClass = "w-full h-11 px-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition";
  const labelClass = "block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";

  // Active Session Fallback
  if (isCheckingAuth) {
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
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
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
                try {
                  sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
                  localStorage.removeItem(REGISTRATION_DRAFT_KEY);
                } catch (e) {}
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
            Digital tenancy agreements, instant Paystack payouts, and verified Ghana Card identification uniting property owners and residents across Ghana.
          </p>

          {/* Trust Markers */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-300 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Listings
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
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={44}
                height={44}
                className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={44}
                height={44}
                className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-[#141816] dark:text-white leading-none">
                AkwaabaHomes
              </span>
              <span className="text-[10.5px] font-medium text-[#3B6E5C] dark:text-emerald-400 mt-0.5">
                Live Well. Feel at Home.
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href="/login" 
              className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
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
                Step {currentStep} of 3 &bull;{' '}
                {currentStep === 1
                  ? 'Personal Profile'
                  : currentStep === 2
                  ? 'Credentials & Verification'
                  : 'Review & Confirm'}
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-400">
                {currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'}
              </span>
            </div>
            
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0F5132] dark:bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: currentStep === 1 ? '33.33%' : currentStep === 2 ? '66.66%' : '100%' }}
              />
            </div>

            <div className="pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                {currentStep === 3 ? 'Review your details' : 'Create your account'}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                {currentStep === 1 
                  ? 'Select your role and provide your basic personal details.' 
                  : currentStep === 2
                  ? 'Set your secure password and university enrollment information.'
                  : 'Verify your registration summary before creating your AkwaabaHomes account.'}
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
                        ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/30 ring-1 ring-[#16A34A]'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mb-2.5">
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
                        ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/30 ring-1 ring-[#16A34A]'
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
                          ? 'bg-[#16A34A] text-white shadow-2xs' 
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
                          ? 'bg-[#16A34A] text-white shadow-2xs' 
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Profile Photo Uploader */}
              <div className="space-y-1.5">
                <label className={labelClass}>Profile Photo *</label>
                <PassportUpload
                  currentUrl={formData.avatarUrl}
                  onUploadSuccess={(url) => {
                    setFormData((prev) => ({ ...prev, avatarUrl: url }));
                    if (url) {
                      toast.success('Profile photo uploaded successfully!');
                    }
                  }}
                  onUploadError={(err) => {
                    if (err) {
                      triggerError(err);
                    }
                  }}
                  label="Profile Picture"
                  description="Upload a clear portrait or passport-style photo (up to 10MB). Frame, zoom, and crop before automatic HD optimization."
                  optional={false}
                  required={true}
                />
              </div>

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
                {/* User Phone Number with Ghanaian Carrier Detection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>Phone Number *</label>
                    {userCarrier && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all animate-in fade-in ${userCarrier.badgeBg} ${userCarrier.badgeColor} ${userCarrier.badgeBorder}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{userCarrier.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <span className="text-xs mr-1 select-none">🇬🇭</span>
                    </div>
                    <input 
                      type="tel" 
                      required 
                      className={`${inputClass} pl-10 pr-9 font-mono`} 
                      value={formData.phoneNumber} 
                      onChange={(e) => handlePhoneChange(e.target.value, 'phoneNumber')} 
                      placeholder="054 123 4567" 
                    />
                    {isUserPhoneValid && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600 dark:text-emerald-400 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {isUserPhoneValid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid Ghanaian mobile line (MoMo ready)
                      </span>
                    ) : (
                      'Format: 0XX XXX XXXX (e.g. 054 123 4567)'
                    )}
                  </p>
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
                {formData.role === 'TENANT' && (
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
                )}
                <div className={formData.role === 'TENANT' ? '' : 'sm:col-span-2'}>
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
            <div className="space-y-4">
              
              {/* Email Address with Live Availability Check */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Email Address *</label>
                  {emailCheckStatus === 'CHECKING' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      <span>Checking availability...</span>
                    </span>
                  )}
                  {emailCheckStatus === 'AVAILABLE' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Email available</span>
                    </span>
                  )}
                  {emailCheckStatus === 'EXISTS' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Already registered</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input 
                    type="email" 
                    required 
                    autoComplete="email" 
                    className={`${inputClass} pl-10 pr-9 ${
                      emailCheckStatus === 'EXISTS' 
                        ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500/10' 
                        : emailCheckStatus === 'AVAILABLE'
                        ? 'border-emerald-400 dark:border-emerald-700'
                        : ''
                    }`} 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    placeholder="e.g. kwame@st.ug.edu.gh or name@gmail.com" 
                  />
                  {emailCheckStatus === 'CHECKING' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    </div>
                  )}
                  {emailCheckStatus === 'AVAILABLE' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600 dark:text-emerald-400 pointer-events-none">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {emailCheckStatus === 'EXISTS' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-rose-500 pointer-events-none">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Email Feedback Helper */}
                {emailCheckStatus === 'EXISTS' ? (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-2.5 text-[11px] text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 animate-in fade-in">
                    <span>This email is already associated with an AkwaabaHomes account.</span>
                    <Link
                      href="/login"
                      className="font-bold underline text-rose-800 dark:text-rose-200 hover:text-rose-950 shrink-0"
                    >
                      Sign in &rarr;
                    </Link>
                  </div>
                ) : emailCheckStatus === 'AVAILABLE' ? (
                  <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready to register. Verification link will be sent here.
                  </p>
                ) : (
                  <p className="text-[10.5px] text-zinc-400">
                    We will send a statutory confirmation link to this address.
                  </p>
                )}
              </div>

              {/* Student Campus Verification Fields */}
              {formData.role === 'TENANT' && formData.isStudent && (
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
                      {/* Guardian Phone Number with Carrier Detection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={labelClass}>Guardian Phone Number *</label>
                          {guardianCarrier && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all animate-in fade-in ${guardianCarrier.badgeBg} ${guardianCarrier.badgeColor} ${guardianCarrier.badgeBorder}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              <span>{guardianCarrier.label}</span>
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                            <span className="text-xs mr-1 select-none">🇬🇭</span>
                          </div>
                          <input 
                            type="tel" 
                            required 
                            className={`${inputClass} pl-10 pr-9 font-mono`} 
                            value={formData.guardianPhone} 
                            onChange={(e) => handlePhoneChange(e.target.value, 'guardianPhone')} 
                            placeholder="054 123 4567" 
                          />
                          {isGuardianPhoneValid && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600 dark:text-emerald-400 pointer-events-none">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1">
                          {isGuardianPhoneValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Valid Ghanaian mobile line
                            </span>
                          ) : (
                            'Format: 0XX XXX XXXX (e.g. 054 123 4567)'
                          )}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Password Fields & Security Meter */}
              <div className="space-y-3 pt-1">
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
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Match / Mismatch Live Feedback */}
                    {formData.confirmPassword.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        {passwordCriteria.isMatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Passwords match</span>
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Passwords do not match yet</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Strength Meter & Interactive Checklist */}
                {formData.password.length > 0 && (
                  <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3.5 space-y-2.5 animate-in fade-in duration-200">
                    
                    {/* Multi-segment strength bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-zinc-400" />
                          <span>Password Strength</span>
                        </span>
                        <span className={`text-[11px] font-bold ${passwordCriteria.colorClass}`}>
                          {passwordCriteria.label}
                        </span>
                      </div>

                      {/* 4 Segment Bars */}
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div className={`rounded-full transition-all duration-300 ${passwordCriteria.score >= 1 ? passwordCriteria.barColor : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                        <div className={`rounded-full transition-all duration-300 ${passwordCriteria.score >= 2 ? passwordCriteria.barColor : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                        <div className={`rounded-full transition-all duration-300 ${passwordCriteria.score >= 3 ? passwordCriteria.barColor : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                        <div className={`rounded-full transition-all duration-300 ${passwordCriteria.score >= 4 ? passwordCriteria.barColor : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                      </div>
                    </div>

                    {/* Interactive Security Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px]">
                      <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasMinLength ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {passwordCriteria.hasMinLength ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                        )}
                        <span>8+ characters</span>
                      </div>

                      <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {passwordCriteria.hasNumber ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                        )}
                        <span>At least 1 number (0–9)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasUpper ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {passwordCriteria.hasUpper ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                        )}
                        <span>Uppercase letter (A–Z)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasLower ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {passwordCriteria.hasLower ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                        )}
                        <span>Lowercase letter (a–z)</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Step 2 Buttons */}
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
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={handleReviewStep}
                  disabled={!isStep1Valid || !isStep2Valid}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="flex-1"
                >
                  Review Summary
                </Button>
              </div>

            </div>
          )}

          {/* ──── STEP 3: Review Summary & Confirm ──── */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Summary Card 1: Personal Identity */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">
                      Personal Identity
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                      {formData.role === 'LANDLORD'
                        ? 'Landlord & Host'
                        : formData.isStudent
                        ? 'Student Tenant'
                        : 'Residential Tenant'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* Profile Photo & Name Summary */}
                <div className="flex items-center gap-3.5 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 shadow-2xs">
                    {formData.avatarUrl ? (
                      <img
                        src={getImageUrl(formData.avatarUrl)}
                        alt={fullNameDisplay || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                      {fullNameDisplay || 'Not specified'}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      {formData.avatarUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Profile photo verified
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">
                          Profile photo required *
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Legal Full Name</dt>
                    <dd className="font-bold text-zinc-950 dark:text-white truncate">{fullNameDisplay}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Phone Number</dt>
                    <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                      <span>{formData.phoneNumber}</span>
                      {userCarrier && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${userCarrier.badgeBg} ${userCarrier.badgeColor} ${userCarrier.badgeBorder}`}>
                          {userCarrier.label}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Gender</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formData.gender === 'MALE' ? 'Male' : 'Female'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Nationality</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.nationality}</dd>
                  </div>
                  {formData.role === 'TENANT' && formData.dateOfBirth && (
                    <div className="col-span-2">
                      <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Date of Birth</dt>
                      <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{formData.dateOfBirth}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Summary Card 2: Credentials & Campus Verification */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">
                      {formData.role === 'TENANT' && formData.isStudent
                        ? 'Credentials & Campus Enrolment'
                        : 'Account Credentials'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Email Address</dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white break-all">{formData.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Password</dt>
                    <dd className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span>••••••••</span>
                      <Check className="w-3 h-3" />
                    </dd>
                  </div>

                  {formData.role === 'TENANT' && formData.isStudent && (
                    <>
                      <div className="col-span-2 pt-1.5 border-t border-zinc-200/70 dark:border-zinc-800/80">
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Institution / Campus</dt>
                        <dd className="font-bold text-zinc-950 dark:text-white">
                          {campusLabels[formData.campus] || formData.campus}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Student ID / Index No.</dt>
                        <dd className="font-mono font-bold text-zinc-950 dark:text-white">{formData.studentId}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Academic Level</dt>
                        <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {formData.yearOfStudy === '500' ? 'Postgraduate' : `Level ${formData.yearOfStudy}`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Programme</dt>
                        <dd className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{formData.programmeOfStudy}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Admission Date</dt>
                        <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{formData.dateOfAdmission}</dd>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-zinc-200/70 dark:border-zinc-800/80">
                        <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Emergency Guardian Contact</dt>
                        <dd className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                          <span>{formData.guardianName} &bull; <span className="font-mono">{formData.guardianPhone}</span></span>
                          {guardianCarrier && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${guardianCarrier.badgeBg} ${guardianCarrier.badgeColor} ${guardianCarrier.badgeBorder}`}>
                              {guardianCarrier.label}
                            </span>
                          )}
                        </dd>
                      </div>
                    </>
                  )}

                  {appliedPromo && (
                    <div className="col-span-2 pt-1.5 border-t border-zinc-200/70 dark:border-zinc-800/80">
                      <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">Campus Promo / Referral</dt>
                      <dd className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs">{appliedPromo.code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${appliedPromo.badgeBg} ${appliedPromo.badgeColor} ${appliedPromo.badgeBorder}`}>
                          {appliedPromo.badgeText}
                        </span>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">• {appliedPromo.benefit}</span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Optional Campus Ambassador / Referral Promo Code Card */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-[#0F5132] dark:text-emerald-400 shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <span>Campus Ambassador / Referral Promo</span>
                        <span className="text-[10px] text-zinc-400 font-normal">(Optional)</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Have a student ambassador promo code or friend referral link?
                      </div>
                    </div>
                  </div>
                  
                  {!appliedPromo && (
                    <button
                      type="button"
                      onClick={() => setShowPromoField(!showPromoField)}
                      className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{showPromoField ? 'Hide' : 'Add Code'}</span>
                      {showPromoField ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Applied Promo Banner */}
                {appliedPromo && (
                  <div className="mt-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/50 p-3 flex items-start justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 font-mono tracking-wide">
                            {appliedPromo.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${appliedPromo.badgeBg} ${appliedPromo.badgeColor} ${appliedPromo.badgeBorder}`}>
                            {appliedPromo.badgeText}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                          {appliedPromo.title}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-snug">
                          ✨ {appliedPromo.benefit}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePromo}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-semibold p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shrink-0 cursor-pointer"
                      title="Remove code"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Collapsible Input Field */}
                {showPromoField && !appliedPromo && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              verifyPromo();
                            }
                          }}
                          placeholder="e.g. LEGON2025, KNUST50, or AMB-CODE"
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="emerald"
                        onClick={() => verifyPromo()}
                        disabled={!promoInput.trim() || isVerifyingPromo}
                        isLoading={isVerifyingPromo}
                        className="text-xs h-8.5 px-3.5 shrink-0"
                      >
                        Apply
                      </Button>
                    </div>

                    {promoError && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{promoError}</span>
                      </div>
                    )}

                    {/* Recommended Campus Quick-Picks */}
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-zinc-400 font-medium">Campus perks:</span>
                      {(formData.campus === 'UG' ? ['LEGON2025', 'AKWAABA'] :
                        formData.campus === 'KNUST' ? ['KNUST2025', 'KNUST50', 'AKWAABA'] :
                        formData.campus === 'UCC' ? ['UCC2025', 'AKWAABA'] :
                        formData.campus === 'UPSA' ? ['UPSA2025', 'AKWAABA'] :
                        ['LEGON2025', 'KNUST2025', 'UCC2025', 'AKWAABA']
                      ).map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setPromoInput(chip);
                            verifyPromo(chip);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white dark:bg-zinc-800 text-zinc-600 hover:text-[#0F5132] dark:text-zinc-300 dark:hover:text-emerald-300 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 transition cursor-pointer"
                        >
                          +{chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Statutory Data Protection & Security Trust Seals (Act 843, Act 220, 256-Bit TLS) */}
              <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-linear-to-b from-zinc-50/80 to-zinc-100/40 dark:from-zinc-900/60 dark:to-zinc-950/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span>Statutory Compliance & Escrow Protection</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300/60 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Legal Infrastructure
                  </span>
                </div>

                {/* 3 Trust Seals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Seal 1: Act 843 Privacy */}
                  <div className="p-2.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-[#0F5132] dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        Act 843 Compliant
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        Ghana Data Protection Act (DPC) lawful identity safeguards.
                      </div>
                    </div>
                  </div>

                  {/* Seal 2: 256-Bit TLS & AES */}
                  <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-800/40 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        256-Bit TLS / AES
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        Bank-grade data transit encryption & isolated tokens.
                      </div>
                    </div>
                  </div>

                  {/* Seal 3: Rent Act 220 Escrow */}
                  <div className="p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/25 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        Act 220 Escrow
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        Caution deposits & rent held until verified check-in.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory Allocation Notice */}
                <div className="rounded-lg bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-zinc-900 dark:text-zinc-200">Legal Tenancy Pre-Verification: </strong>
                    Your legal full name, gender, and contact details are automatically formatted onto enforceable tenancy agreements under Ghana Rent Act (Act 220) and ensure gender-matched room allocation safety.
                  </span>
                </div>
              </div>

              {/* "What Happens Next?" Post-Registration Expectations Roadmap (#7) */}
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0F5132] dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>What Happens After You Submit?</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                    3-Step Onboarding
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Step 1: Email Verification */}
                  <div className="p-2.5 rounded-lg bg-white/90 dark:bg-zinc-900/70 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0F5132] text-white text-[10px] font-bold font-mono">
                        1
                      </span>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950/80 text-[#0F5132] dark:text-emerald-300">
                        ~1 min
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        Confirm Your Email
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        Click the activation link sent to{' '}
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          {formData.email || 'your inbox'}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Role-specific KYC */}
                  <div className="p-2.5 rounded-lg bg-white/90 dark:bg-zinc-900/70 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0F5132] text-white text-[10px] font-bold font-mono">
                        2
                      </span>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        {formData.role === 'LANDLORD' ? '< 24 hrs' : 'Fast-Track'}
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        {formData.role === 'LANDLORD'
                          ? 'Host & Deed Verification'
                          : 'Ghana Card KYC Unlock'}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        {formData.role === 'LANDLORD'
                          ? 'Upload your Ghana Card & ownership proof to earn your Verified Host badge.'
                          : formData.isStudent
                          ? 'Complete quick Ghana Card verification in your portal for roommate matching.'
                          : 'Complete NIA Ghana Card verification in your dashboard for priority approval.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Instant Access */}
                  <div className="p-2.5 rounded-lg bg-white/90 dark:bg-zinc-900/70 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold font-mono">
                        3
                      </span>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        Instant
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        {formData.role === 'LANDLORD'
                          ? 'List & Receive Payouts'
                          : 'Book & Lock Your Room'}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        {formData.role === 'LANDLORD'
                          ? 'Publish properties, automate Act 220 leases, and collect MoMo/Bank payouts.'
                          : formData.isStudent
                          ? `Reserve verified hostels near ${formData.campus || 'campus'} with MoMo & escrow safety.`
                          : 'Reserve verified homes, sign digital leases, and pay securely via escrow.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="pt-1">
                <label htmlFor="register-accept-terms" className="inline-flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    id="register-accept-terms"
                    name="acceptTerms"
                    type="checkbox" 
                    required 
                    checked={formData.acceptTerms} 
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })} 
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#16A34A] focus:ring-[#16A34A] accent-[#16A34A] cursor-pointer" 
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    I confirm that the details above are accurate, consent to lawful data processing under the{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">Ghana Data Protection Act (Act 843)</strong>, and agree to the{' '}
                    <Link href="/terms" target="_blank" className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {/* Step 3 Action Buttons */}
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
                  disabled={isLoading || !isStep1Valid || !isStep2Valid || !formData.acceptTerms}
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
              className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </div>

        </div>

        {/* Bottom Footer */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd.</span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Act 843 &amp; 256-bit TLS Protected
            </span>
          </div>
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
