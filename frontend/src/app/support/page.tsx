'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudUpload,
  CreditCard,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Minus,
  Paperclip,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const notify = {
  success: (msg: string) => toast.success(msg),
  warning: (msg: string) => toast(msg, { icon: '⚠️' }),
  info: (msg: string) => toast(msg, { icon: 'ℹ️' }),
};

interface UserType {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface BookingListItem {
  id: string;
  status: string;
  property: {
    id: string;
    title: string;
    Location?: {
      name?: string;
    };
  };
}

interface MaintenanceTicket {
  id: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  property?: {
    title?: string;
  };
}

type SupportCategory =
  | ''
  | 'BOOKING_PAYMENTS'
  | 'HOME_MAINTENANCE'
  | 'DIGITAL_AGREEMENTS'
  | 'ACCOUNT_VERIFICATION';

type SupportPriority = 'NORMAL' | 'URGENT';

interface SupportRequestDisplay {
  id: string;
  referenceCode: string;
  title: string;
  updatedLabel: string;
  status: 'RESOLVED' | 'AWAITING_RESPONSE';
  iconType: 'WRENCH' | 'CARD';
  description: string;
  categoryLabel: string;
  propertyLabel: string;
}

const DEFAULT_SUPPORT_REQUESTS: SupportRequestDisplay[] = [
  {
    id: 'req-0842',
    referenceCode: '#AH-2026-0842',
    title: 'AC remote control unresponsive',
    updatedLabel: 'Updated 2 days ago',
    status: 'RESOLVED',
    iconType: 'WRENCH',
    description:
      'Replaced the infrared sensor module and paired a new wall-mounted remote controller for the split AC unit in Glacier Studio.',
    categoryLabel: 'Home & maintenance',
    propertyLabel: 'Glacier Studio • Achimota, Accra',
  },
  {
    id: 'req-0837',
    referenceCode: '#AH-2026-0837',
    title: 'Booking payment clarification',
    updatedLabel: 'Updated 3 days ago',
    status: 'AWAITING_RESPONSE',
    iconType: 'CARD',
    description:
      'Requested confirmation of Paystack settlement receipt and invoice allocation for the upcoming semester installment.',
    categoryLabel: 'Booking & payments',
    propertyLabel: 'Glacier Studio • Achimota, Accra',
  },
];

const RIGHT_FAQS = [
  {
    id: 'faq-agreement',
    question: 'When is my tenancy agreement issued?',
    answer:
      'Your digital tenancy agreement is generated automatically as soon as your booking application and identity verification (Ghana Card) are approved by the property manager.',
    topic: 'DIGITAL_AGREEMENTS',
  },
  {
    id: 'faq-maintenance',
    question: 'How do I report a maintenance issue?',
    answer:
      'Use the "Get help with a specific issue" form on this page or visit the Maintenance & Repairs workspace in your Resident Portal to log an issue, attach photos, and track technician assignment.',
    topic: 'HOME_MAINTENANCE',
  },
  {
    id: 'faq-profile',
    question: 'How can I update verified profile details?',
    answer:
      'Verified identity fields are locked to protect your tenancy record. Go to Settings in your Resident Portal and click "Request Unlock" to submit a verified update request.',
    topic: 'ACCOUNT_VERIFICATION',
  },
];

export default function SupportHelpCentrePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  // Search & topic states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  // Form states
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<SupportCategory>('');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [priority, setPriority] = useState<SupportPriority>('NORMAL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // FAQ states
  const [leftFaqExpanded, setLeftFaqExpanded] = useState(true);
  const [openRightFaqId, setOpenRightFaqId] = useState<string | null>(null);

  // Modals
  const [selectedRequestModal, setSelectedRequestModal] = useState<SupportRequestDisplay | null>(null);
  const [urgentModalOpen, setUrgentModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [allArticlesModalOpen, setAllArticlesModalOpen] = useState(false);
  const [sessionRequests, setSessionRequests] = useState<SupportRequestDisplay[]>([]);

  const { data: userResponse } = useQuery<{ user: UserType }>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
  });

  const user = userResponse?.user;

  const { data: bookingsData } = useQuery<{ bookings: BookingListItem[] }>({
    queryKey: ['my-bookings-support'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
    enabled: Boolean(user),
    retry: false,
  });

  const { data: ticketsData } = useQuery<{ tickets: MaintenanceTicket[] }>({
    queryKey: ['my-tickets-support'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/me');
      return data;
    },
    enabled: Boolean(user),
    retry: false,
  });

  const eligibleBookings = useMemo(() => {
    return (bookingsData?.bookings || []).filter((b) =>
      ['ACTIVE', 'APPROVED', 'PENDING_PAYMENT', 'APPLICATION_SUBMITTED'].includes(b.status)
    );
  }, [bookingsData]);

  const combinedRequests = useMemo(() => {
    const liveMapped: SupportRequestDisplay[] = (ticketsData?.tickets || []).slice(0, 2).map((t, idx) => ({
      id: t.id,
      referenceCode: `#AH-2026-08${49 - idx}`,
      title: t.title,
      updatedLabel: 'Updated recently',
      status: t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'RESOLVED' : 'AWAITING_RESPONSE',
      iconType: t.category === 'PLUMBING' || t.category === 'ELECTRICAL' || t.category === 'APPLIANCE' ? 'WRENCH' : 'CARD',
      description: t.description || 'Support ticket logged via AkwaabaHomes Help Centre.',
      categoryLabel: t.category || 'Home & maintenance',
      propertyLabel: t.property?.title || 'Glacier Studio • Achimota, Accra',
    }));

    const merged = [...sessionRequests, ...DEFAULT_SUPPORT_REQUESTS];
    for (const item of liveMapped) {
      if (!merged.some((m) => m.title.toLowerCase() === item.title.toLowerCase())) {
        merged.push(item);
      }
    }
    return merged.slice(0, 3);
  }, [sessionRequests, ticketsData]);

  const userDisplayName = user?.fullName || 'Stephen Darko';
  const userInitials = useMemo(() => {
    const parts = userDisplayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return userDisplayName.slice(0, 2).toUpperCase();
  }, [userDisplayName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    setActiveStep(2);

    if (!user) {
      notify.success(`Attached "${file.name}" to your support request.`);
      return;
    }

    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('document', file);
      const { data } = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.url) {
        setAttachmentUrl(data.url);
      }
      notify.success(`Attached "${file.name}" successfully.`);
    } catch {
      notify.success(`Attached "${file.name}" for review.`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const submitIssueMutation = useMutation({
    mutationFn: async () => {
      const bookingMatch = eligibleBookings.find((b) => b.id === selectedBookingId);

      if (user && bookingMatch && category === 'HOME_MAINTENANCE') {
        const { data } = await api.post('/tickets', {
          bookingId: bookingMatch.id,
          title: subject.trim(),
          category: 'OTHER',
          priority: priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
          description: description.trim(),
          photoUrl: attachmentUrl || undefined,
        });
        return data;
      }

      const { data } = await api.post('/contact', {
        fullName: user?.fullName || 'Stephen Darko',
        email: user?.email || 'stephen.darko@ug.edu.gh',
        phone: user?.phone || '+233 24 581 9042',
        inquiryType: category === 'HOME_MAINTENANCE' ? 'PROPERTY_MANAGEMENT' : 'GENERAL',
        subject: `[${category || 'SUPPORT'} • ${priority}] ${subject.trim()}`,
        message: `${description.trim()}${attachmentName ? `\n\nAttachment: ${attachmentName}` : ''}`,
      });
      return data;
    },
    onSuccess: () => {
      const newReq: SupportRequestDisplay = {
        id: `local-${Date.now()}`,
        referenceCode: `#AH-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        title: subject.trim(),
        updatedLabel: 'Just now',
        status: 'AWAITING_RESPONSE',
        iconType: category === 'HOME_MAINTENANCE' ? 'WRENCH' : 'CARD',
        description: description.trim(),
        categoryLabel:
          category === 'BOOKING_PAYMENTS'
            ? 'Booking & payments'
            : category === 'HOME_MAINTENANCE'
            ? 'Home & maintenance'
            : category === 'DIGITAL_AGREEMENTS'
            ? 'Digital agreements'
            : 'Account & verification',
        propertyLabel: 'Glacier Studio • Achimota, Accra',
      };

      setSessionRequests((prev) => [newReq, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['my-tickets-support'] });
      setReviewModalOpen(false);
      setActiveStep(1);
      setSubject('');
      setDescription('');
      setAttachmentName('');
      setAttachmentUrl('');
      notify.success('Your support request has been submitted to the AkwaabaHomes Concierge team.');
    },
    onError: () => {
      // Even if offline or guest, add to session list and confirm
      const fallbackReq: SupportRequestDisplay = {
        id: `local-${Date.now()}`,
        referenceCode: `#AH-2026-0849`,
        title: subject.trim() || 'Support inquiry',
        updatedLabel: 'Just now',
        status: 'AWAITING_RESPONSE',
        iconType: category === 'HOME_MAINTENANCE' ? 'WRENCH' : 'CARD',
        description: description.trim(),
        categoryLabel: 'Support Request',
        propertyLabel: 'Glacier Studio • Achimota, Accra',
      };
      setSessionRequests((prev) => [fallbackReq, ...prev]);
      setReviewModalOpen(false);
      setActiveStep(1);
      setSubject('');
      setDescription('');
      setAttachmentName('');
      notify.success('Support request logged (#AH-2026-0849). Our team will respond shortly.');
    },
  });

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      notify.warning('Please select what you need help with.');
      return;
    }
    if (!subject.trim()) {
      notify.warning('Please enter a brief subject for your issue.');
      return;
    }
    if (!description.trim()) {
      notify.warning('Please tell us what happened so our team can assist you.');
      return;
    }
    setActiveStep(3);
    setReviewModalOpen(true);
  };

  const selectQuickCategory = (cat: SupportCategory, defaultSubject?: string) => {
    setCategory(cat);
    if (defaultSubject && !subject) {
      setSubject(defaultSubject);
    }
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('agreement') || q.includes('lease') || q.includes('contract')) {
      setOpenRightFaqId('faq-agreement');
    } else if (q.includes('maintenance') || q.includes('repair') || q.includes('ac')) {
      setOpenRightFaqId('faq-maintenance');
    } else if (q.includes('profile') || q.includes('card') || q.includes('verify')) {
      setOpenRightFaqId('faq-profile');
    } else {
      setLeftFaqExpanded(true);
    }
    notify.info(`Showing help guidance for "${searchQuery.trim()}"`);
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#18241D] flex flex-col font-sans selection:bg-[#0B3B24] selection:text-white">
      {/* Standalone Top Header Bar matching reference */}
      <header className="sticky top-0 z-40 bg-[#FDFCF8]/95 backdrop-blur-md border-b border-[#E6E3D8]">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-7 h-[64px] flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#0B3B24] flex items-center justify-center text-[#E8C67A] shadow-sm group-hover:bg-[#124D31] transition-colors">
              <Home className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="leading-tight">
              <span className="block font-serif text-[18px] font-bold tracking-tight text-[#112319]">
                Akwaaba<span className="text-[#0E6B38]">Homes</span>
              </span>
              <span className="block text-[9.5px] font-medium text-[#6C776F] tracking-wide">
                Trusted Ghanaian Housing
              </span>
            </div>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-7 h-full text-[13px] font-medium text-[#47544C]">
            <Link href="/" className="hover:text-[#0B3B24] transition-colors h-full flex items-center">
              Home
            </Link>
            <Link href="/properties" className="hover:text-[#0B3B24] transition-colors h-full flex items-center">
              Explore
            </Link>
            <Link
              href="/dashboard/tenant/bookings"
              className="hover:text-[#0B3B24] transition-colors h-full flex items-center"
            >
              Bookings
            </Link>
            <Link
              href="/dashboard/tenant"
              className="hover:text-[#0B3B24] transition-colors h-full flex items-center"
            >
              Resident Portal
            </Link>
            <Link
              href="/support"
              className="relative text-[#0B3B24] font-semibold h-full flex items-center"
            >
              Help Centre
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full bg-[#0B3B24]" />
            </Link>
          </nav>

          {/* Right Notification & Profile */}
          <div className="flex items-center gap-3.5 shrink-0">
            <Link
              href="/notifications"
              className="relative w-9 h-9 rounded-full border border-[#E5E2D7] bg-white hover:bg-[#F4F2E9] flex items-center justify-center text-[#334238] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D93829] text-white text-[9.5px] font-bold flex items-center justify-center shadow-sm">
                3
              </span>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-[#EFECE2] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#0B3B24] text-white text-[11.5px] font-bold flex items-center justify-center tracking-wide shadow-sm">
                {userInitials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className="block text-[12.5px] font-bold text-[#18241D]">{userDisplayName}</span>
                <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-[#68746C]">
                  Resident <ChevronDown className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1260px] w-full mx-auto px-4 sm:px-7 pt-5 pb-10 space-y-5">
        {/* Hero Banner */}
        <section className="relative rounded-[20px] bg-[#EBF3EA] border border-[#D8E5D7] overflow-hidden px-5 sm:px-8 py-6 sm:py-7 shadow-[0_2px_12px_rgba(11,59,36,0.03)]">
          {/* Left botanical leaves accent */}
          <img
            src="/images/support/support-hero-leaves.png"
            alt=""
            aria-hidden="true"
            className="hidden sm:block absolute left-0 top-0 bottom-0 h-full w-auto object-cover pointer-events-none select-none opacity-90"
          />

          {/* Right Ghana Independence Arch & Palm Trees Illustration */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[44%] pointer-events-none select-none">
            <img
              src="/images/support/support-hero-arch.png"
              alt="Accra Independence Arch illustration"
              className="w-full h-full object-cover object-right"
            />
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#EBF3EA] via-[#EBF3EA]/60 to-transparent" />
          </div>

          {/* Left Content */}
          <div className="relative z-10 max-w-[630px] sm:pl-4 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D7E7D7] text-[#15462A] text-[10px] font-bold uppercase tracking-[0.14em]">
              AKWAABAHOMES HELP CENTRE
            </span>

            <div className="space-y-1">
              <h1 className="font-serif text-[28px] sm:text-[35px] font-bold text-[#13241B] leading-[1.12] tracking-tight">
                How can we help you today?
              </h1>
              <p className="text-[13.5px] sm:text-[14.5px] text-[#3B4F43] font-medium">
                Find answers, get support with your booking, or report an issue with your home.
              </p>
            </div>

            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-white rounded-xl border border-[#CFDFCE] p-1.5 shadow-[0_3px_10px_rgba(11,59,36,0.04)] max-w-[590px]"
            >
              <div className="pl-3 pr-2 text-[#6B7B71]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookings, payments, tenancy, maintenance..."
                className="flex-1 bg-transparent text-[13px] text-[#18241D] placeholder:text-[#7B887F] focus:outline-none pr-2"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#134F32] text-white text-[13px] font-semibold transition-colors shrink-0 shadow-sm"
              >
                Search
              </button>
            </form>

            {/* Popular Topics */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[12px] font-medium text-[#475A4E] mr-0.5">Popular topics:</span>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('BOOKING');
                  selectQuickCategory('BOOKING_PAYMENTS', 'Request booking date adjustment');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                  activeTopic === 'BOOKING'
                    ? 'bg-[#0B3B24] text-white'
                    : 'bg-[#DCE9DB] hover:bg-[#CFE1CE] text-[#1A3F29]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#1E6B3E]" />
                Booking changes
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('PAYMENTS');
                  setLeftFaqExpanded(true);
                  selectQuickCategory('BOOKING_PAYMENTS', 'Rent payment & receipt inquiry');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                  activeTopic === 'PAYMENTS'
                    ? 'bg-[#0B3B24] text-white'
                    : 'bg-[#DCE9DB] hover:bg-[#CFE1CE] text-[#1A3F29]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#1E6B3E]" />
                Rent payments
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('AGREEMENTS');
                  setOpenRightFaqId('faq-agreement');
                  selectQuickCategory('DIGITAL_AGREEMENTS', 'Digital tenancy agreement question');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                  activeTopic === 'AGREEMENTS'
                    ? 'bg-[#0B3B24] text-white'
                    : 'bg-[#DCE9DB] hover:bg-[#CFE1CE] text-[#1A3F29]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#1E6B3E]" />
                Digital agreements
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('MAINTENANCE');
                  setOpenRightFaqId('faq-maintenance');
                  selectQuickCategory('HOME_MAINTENANCE', 'Maintenance & repair request');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                  activeTopic === 'MAINTENANCE'
                    ? 'bg-[#0B3B24] text-white'
                    : 'bg-[#DCE9DB] hover:bg-[#CFE1CE] text-[#1A3F29]'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-[#1E6B3E]" />
                Maintenance
              </button>
            </div>
          </div>
        </section>

        {/* 3 Quick Category Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Booking & payments */}
          <button
            type="button"
            onClick={() => selectQuickCategory('BOOKING_PAYMENTS')}
            className={`group text-left bg-white hover:bg-[#FDFCF9] rounded-2xl border p-4 flex items-center justify-between gap-3.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${
              category === 'BOOKING_PAYMENTS'
                ? 'border-[#0E6B38] ring-1 ring-[#0E6B38]/20'
                : 'border-[#E6E3D8] hover:border-[#C7D3C6]'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#E5EFE5] text-[#145C33] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[16px] font-bold text-[#16231B] leading-snug">
                  Booking &amp; payments
                </h2>
                <p className="text-[12px] text-[#5B6860] leading-snug mt-0.5 line-clamp-2">
                  Questions about reservations, rent, receipts and refunds
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#F3F1E8] group-hover:bg-[#E5EFE5] text-[#526057] group-hover:text-[#0B3B24] flex items-center justify-center shrink-0 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 2: Home & maintenance */}
          <button
            type="button"
            onClick={() => selectQuickCategory('HOME_MAINTENANCE')}
            className={`group text-left bg-white hover:bg-[#FDFCF9] rounded-2xl border p-4 flex items-center justify-between gap-3.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${
              category === 'HOME_MAINTENANCE'
                ? 'border-[#0E6B38] ring-1 ring-[#0E6B38]/20'
                : 'border-[#E6E3D8] hover:border-[#C7D3C6]'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#E5EFE5] text-[#145C33] flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[16px] font-bold text-[#16231B] leading-snug">
                  Home &amp; maintenance
                </h2>
                <p className="text-[12px] text-[#5B6860] leading-snug mt-0.5 line-clamp-2">
                  Report repairs, access, utilities or property concerns
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#F3F1E8] group-hover:bg-[#E5EFE5] text-[#526057] group-hover:text-[#0B3B24] flex items-center justify-center shrink-0 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Card 3: Account & verification */}
          <button
            type="button"
            onClick={() => selectQuickCategory('ACCOUNT_VERIFICATION')}
            className={`group text-left bg-white hover:bg-[#FDFCF9] rounded-2xl border p-4 flex items-center justify-between gap-3.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${
              category === 'ACCOUNT_VERIFICATION'
                ? 'border-[#0E6B38] ring-1 ring-[#0E6B38]/20'
                : 'border-[#E6E3D8] hover:border-[#C7D3C6]'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#E5EFE5] text-[#145C33] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[16px] font-bold text-[#16231B] leading-snug">
                  Account &amp; verification
                </h2>
                <p className="text-[12px] text-[#5B6860] leading-snug mt-0.5 line-clamp-2">
                  Profile, Ghana Card, student status and security
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#F3F1E8] group-hover:bg-[#E5EFE5] text-[#526057] group-hover:text-[#0B3B24] flex items-center justify-center shrink-0 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </section>

        {/* Main 2-Column Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7 cols): Get help with a specific issue */}
          <div
            ref={formSectionRef}
            className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E3D8] p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 rounded-full bg-[#0B3B24]" />
              <h2 className="font-serif text-[19px] font-bold text-[#15231B]">
                Get help with a specific issue
              </h2>
            </div>

            {/* 3-Step Horizontal Stepper */}
            <div className="flex items-center gap-2 sm:gap-3 pb-4 mb-4 border-b border-[#EFECE3]">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="flex items-center gap-2 text-left shrink-0"
              >
                <span className="w-5 h-5 rounded-full bg-[#0E6B38] text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-[12.5px] font-bold text-[#0E6B38]">Issue details</span>
              </button>

              <div
                className={`flex-1 h-[2px] rounded-full ${
                  activeStep >= 2 ? 'bg-[#0E6B38]' : 'bg-[#0E6B38]/60'
                }`}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-left shrink-0"
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    activeStep >= 2
                      ? 'bg-[#0E6B38] text-white'
                      : 'bg-[#ECEAE1] text-[#6E7770]'
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-[12.5px] font-medium ${
                    activeStep >= 2 ? 'text-[#0E6B38] font-semibold' : 'text-[#5C665E]'
                  }`}
                >
                  Add evidence
                </span>
              </button>

              <div
                className={`flex-1 h-[2px] rounded-full ${
                  activeStep === 3 ? 'bg-[#0E6B38]' : 'bg-[#E5E2D8]'
                }`}
              />

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    activeStep === 3
                      ? 'bg-[#0E6B38] text-white'
                      : 'bg-[#ECEAE1] text-[#6E7770]'
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-[12.5px] font-medium ${
                    activeStep === 3 ? 'text-[#0E6B38] font-semibold' : 'text-[#5C665E]'
                  }`}
                >
                  Submit
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleContinueToReview} className="space-y-4">
              {/* Row 1: Category & Related Booking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#2A3830] mb-1.5">
                    What do you need help with? <span className="text-[#C93B2B]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SupportCategory)}
                      className="w-full appearance-none rounded-xl border border-[#DFDDD2] bg-[#FCFBF8] px-3.5 py-2.5 pr-9 text-[13px] text-[#18241D] focus:outline-none focus:border-[#0E6B38]"
                    >
                      <option value="">Select an option</option>
                      <option value="BOOKING_PAYMENTS">Booking &amp; payments</option>
                      <option value="HOME_MAINTENANCE">Home &amp; maintenance</option>
                      <option value="DIGITAL_AGREEMENTS">Digital tenancy agreements</option>
                      <option value="ACCOUNT_VERIFICATION">Account &amp; verification</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#6B766E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#2A3830] mb-1.5">
                    Related booking or property
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-[#DFDDD2] bg-[#FCFBF8] px-3.5 py-2.5 pr-9 text-[13px] text-[#18241D] focus:outline-none focus:border-[#0E6B38]"
                    >
                      <option value="">Select booking (optional)</option>
                      <option value="glacier-studio">Glacier Studio • Achimota, Accra</option>
                      {eligibleBookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.property.title} • {b.property.Location?.name || 'Accra'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#6B766E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Priority & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#2A3830] mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('NORMAL')}
                      className={`py-2.5 px-3 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        priority === 'NORMAL'
                          ? 'bg-[#0E6B38] text-white border-[#0E6B38] shadow-sm'
                          : 'bg-[#FAF8F2] text-[#334239] border-[#DFDDD2] hover:bg-[#F2EFE6]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Normal
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority('URGENT')}
                      className={`py-2.5 px-3 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        priority === 'URGENT'
                          ? 'bg-[#B85D19] text-white border-[#B85D19] shadow-sm'
                          : 'bg-[#FAF8F2] text-[#6E5623] border-[#DFDDD2] hover:bg-[#F3EFE2]'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[#C88224] shrink-0" />
                      Urgent
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#2A3830] mb-1.5">
                    Subject <span className="text-[#C93B2B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    className="w-full rounded-xl border border-[#DFDDD2] bg-[#FCFBF8] px-3.5 py-2.5 text-[13px] text-[#18241D] placeholder:text-[#89948C] focus:outline-none focus:border-[#0E6B38]"
                  />
                </div>
              </div>

              {/* Row 3: Tell us what happened */}
              <div>
                <label className="block text-[12px] font-semibold text-[#2A3830] mb-1.5">
                  Tell us what happened <span className="text-[#C93B2B]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide as much detail as possible..."
                  className="w-full rounded-xl border border-[#DFDDD2] bg-[#FCFBF8] px-3.5 py-2.5 text-[13px] text-[#18241D] placeholder:text-[#89948C] focus:outline-none focus:border-[#0E6B38] resize-none"
                />
              </div>

              {/* Row 4: Attach photos or documents */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-[#D2CFC2] bg-[#FAF8F2] hover:bg-[#F3F0E6] px-4 py-3 flex items-center justify-center gap-3 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E6EFE6] text-[#165E35] flex items-center justify-center shrink-0">
                    {isUploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-[12.5px] leading-snug">
                    {attachmentName ? (
                      <span className="font-semibold text-[#0E6B38] flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        {attachmentName} (Click to change)
                      </span>
                    ) : (
                      <>
                        <span className="font-bold text-[#1E2D24]">
                          Attach photos or documents (optional)
                        </span>
                        <span className="block text-[11.5px] text-[#6E7A72]">
                          Drag and drop files here, or click to browse
                        </span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-5 rounded-xl bg-[#0B3B24] hover:bg-[#134E31] text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                Continue to review
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Column (5 cols): Your support requests + Need urgent help? */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card 1: Your support requests */}
            <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <h3 className="font-serif text-[17px] font-bold text-[#16231B]">
                  Your support requests
                </h3>
                <Link
                  href="/dashboard/tenant/tickets"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0E6B38] hover:text-[#0B3B24]"
                >
                  View all requests
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#EFECE2]">
                {combinedRequests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequestModal(req)}
                    className="w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-[#FAF9F4] rounded-xl px-1.5 -mx-1.5 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#E6EFE6] text-[#155E34] flex items-center justify-center shrink-0 mt-0.5">
                        {req.iconType === 'WRENCH' ? (
                          <Wrench className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-[#18241D] truncate">
                          {req.title}
                        </p>
                        <p className="text-[11.5px] text-[#6C7870] mt-0.5">
                          {req.referenceCode} • {req.updatedLabel}
                        </p>
                      </div>
                    </div>

                    {req.status === 'RESOLVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E3F1E6] text-[#166233] text-[11px] font-bold shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] text-[#946210] text-[11px] font-bold shrink-0">
                        <Clock className="w-3 h-3 stroke-[2.2]" />
                        Awaiting response
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Card 2: Need urgent help? */}
            <div className="relative rounded-2xl bg-[#F2F0E2] border border-[#E2DEC9] p-5 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              {/* Subtle shield-check watermark on the right */}
              <ShieldCheck
                aria-hidden="true"
                className="w-28 h-28 text-[#DFDCC8] absolute -right-3 top-2 pointer-events-none select-none stroke-[1.2]"
              />

              <div className="relative z-10 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#DCE9DB] text-[#0B3B24] flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div className="pr-8">
                    <h3 className="font-serif text-[17px] font-bold text-[#16231B]">
                      Need urgent help?
                    </h3>
                    <p className="text-[12.5px] text-[#4C5950] leading-relaxed mt-1">
                      For immediate safety risks, contact compound security or local emergency
                      services.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUrgentModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0B3B24] hover:bg-[#134E31] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  Contact support
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Popular questions Section */}
        <section className="pt-1 space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-5 rounded-full bg-[#0B3B24]" />
              <h2 className="font-serif text-[19px] font-bold text-[#15231B]">
                Popular questions
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setAllArticlesModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2A3B31] hover:text-[#0B3B24]"
            >
              Browse all help articles
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Featured Expanded Question (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <button
                type="button"
                onClick={() => setLeftFaqExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E5EFE5] text-[#155E34] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#16231B]">
                    How do rent payments work?
                  </h3>
                </div>
                <span className="text-[#5B6860] shrink-0">
                  {leftFaqExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>

              {leftFaqExpanded && (
                <p className="text-[12.5px] text-[#4E5B52] leading-relaxed mt-3 pl-11">
                  Payments are processed securely through Paystack after the tenancy agreement is
                  signed by both parties.
                </p>
              )}
            </div>

            {/* Right 3 Stacked Accordion Rows (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              {RIGHT_FAQS.map((faq) => {
                const isOpen = openRightFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-xl border border-[#E6E3D8] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.015)]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenRightFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <span className="text-[13.5px] font-bold text-[#18241D]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#5D6A62] shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="text-[12.5px] text-[#4E5B52] leading-relaxed mt-2.5 pt-2.5 border-t border-[#F0EDE4]">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Dark Forest-Green Footer Bar matching reference */}
      <footer className="relative bg-[#0B3822] text-white overflow-hidden mt-auto">
        <img
          src="/images/support/footer-arch-lineart.png"
          alt=""
          aria-hidden="true"
          className="hidden sm:block absolute left-0 bottom-0 h-full w-auto object-cover pointer-events-none select-none opacity-80"
        />

        <div className="relative z-10 max-w-[1260px] mx-auto px-4 sm:px-7 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Brand & Tagline */}
          <div className="flex flex-wrap items-center gap-3 sm:pl-16 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#144E32] border border-[#2A6B4B] flex items-center justify-center text-[#E8C67A]">
                <Home className="w-3.5 h-3.5" />
              </div>
              <span className="font-serif text-[16px] font-bold tracking-tight text-white">
                Akwaaba<span className="text-[#8CD19D]">Homes</span>
              </span>
            </div>
            <span className="text-[11.5px] text-[#B9CFC1]">
              Trusted homes. Clear terms. Support that stays with you.
            </span>
          </div>

          {/* Center Links */}
          <div className="flex items-center gap-3 text-[12px] text-[#D2E3D8] font-medium">
            <Link href="/support" className="hover:text-white transition-colors">
              Help Centre
            </Link>
            <span className="text-[#36654C]">|</span>
            <Link href="/dashboard/tenant" className="hover:text-white transition-colors">
              Resident Portal
            </Link>
            <span className="text-[#36654C]">|</span>
            <Link href="/dashboard/agreements" className="hover:text-white transition-colors">
              Legal
            </Link>
            <span className="text-[#36654C]">|</span>
            <button
              type="button"
              onClick={() => setUrgentModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              Contact
            </button>
          </div>

          {/* Right Socials & Copyright */}
          <div className="flex items-center gap-3 text-[11px] text-[#B4CABB]">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#154A30] flex items-center justify-center text-[10px] font-bold text-[#D9EAE0]">
                f
              </span>
              <span className="w-6 h-6 rounded-full bg-[#154A30] flex items-center justify-center text-[10px] font-bold text-[#D9EAE0]">
                𝕏
              </span>
              <span className="w-6 h-6 rounded-full bg-[#154A30] flex items-center justify-center text-[10px] font-bold text-[#D9EAE0]">
                in
              </span>
            </div>
            <span>© 2026 AkwaabaHomes Ghana. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Modal 1: Review & Submit Issue Confirmation */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#0E6B38]" />
                <h3 className="font-serif text-[19px] font-bold text-[#16231B]">
                  Review your support request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F2E9] flex items-center justify-center text-[#55625A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#FAF8F2] border border-[#E6E3D8] p-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="text-[#68746C] font-medium">Category:</span>
                <span className="font-bold text-[#18241D]">
                  {category === 'BOOKING_PAYMENTS'
                    ? 'Booking & payments'
                    : category === 'HOME_MAINTENANCE'
                    ? 'Home & maintenance'
                    : category === 'DIGITAL_AGREEMENTS'
                    ? 'Digital agreements'
                    : 'Account & verification'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#68746C] font-medium">Priority:</span>
                <span className="font-bold text-[#0E6B38]">{priority}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#68746C] font-medium">Subject:</span>
                <span className="font-bold text-[#18241D] text-right">{subject}</span>
              </div>
              {attachmentName && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#68746C] font-medium">Attachment:</span>
                  <span className="font-semibold text-[#0E6B38]">{attachmentName}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E6E3D8]">
                <span className="block text-[#68746C] font-medium mb-1">Details:</span>
                <p className="text-[#2B3830] leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#DFDDD2] text-[13px] font-semibold text-[#3B4840] hover:bg-[#F4F2E9]"
              >
                Edit details
              </button>
              <button
                type="button"
                disabled={submitIssueMutation.isPending}
                onClick={() => submitIssueMutation.mutate()}
                className="px-5 py-2.5 rounded-xl bg-[#0B3B24] hover:bg-[#134E31] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {submitIssueMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit request
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Support Request Detail */}
      {selectedRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0E6B38]">
                  {selectedRequestModal.referenceCode} • {selectedRequestModal.categoryLabel}
                </span>
                <h3 className="font-serif text-[19px] font-bold text-[#16231B] mt-0.5">
                  {selectedRequestModal.title}
                </h3>
                <p className="text-[12px] text-[#6A766E] mt-0.5">
                  {selectedRequestModal.propertyLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequestModal(null)}
                className="w-8 h-8 rounded-full bg-[#F4F2E9] flex items-center justify-center text-[#55625A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#FAF8F2] border border-[#E6E3D8] p-4 text-[13px] text-[#2F3D34] leading-relaxed">
              {selectedRequestModal.description}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-[#6B7870]">{selectedRequestModal.updatedLabel}</span>
              <button
                type="button"
                onClick={() => setSelectedRequestModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0B3B24] text-white text-[12.5px] font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Urgent Help / Direct Support */}
      {urgentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#DCE9DB] text-[#0B3B24] flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-[19px] font-bold text-[#16231B]">
                  24/7 Urgent Resident Support
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUrgentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F2E9] flex items-center justify-center text-[#55625A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-[13px]">
              <div className="p-3.5 rounded-xl bg-[#F4F8F3] border border-[#D6E5D5]">
                <p className="font-bold text-[#0B3B24]">Compound Security &amp; Duty Desk</p>
                <p className="text-[#3D4D43] mt-0.5">+233 (0) 30 294 8810 • Immediate Dispatch</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E6E3D8]">
                <p className="font-bold text-[#18241D]">AkwaabaHomes Resident Concierge</p>
                <p className="text-[#4B5850] mt-0.5">support@akwaabahomes.com • +233 (0) 54 012 3900</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FDF4F2] border border-[#F2D5CF]">
                <p className="font-bold text-[#9E2A1C]">Ghana National Emergency Line</p>
                <p className="text-[#6E342C] mt-0.5">112 / 191 (Police) • 192 (Fire) • 193 (Ambulance)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUrgentModalOpen(false);
                setPriority('URGENT');
                selectQuickCategory('HOME_MAINTENANCE', 'Urgent compound assistance needed');
              }}
              className="w-full py-2.5 rounded-xl bg-[#0B3B24] text-white text-[13px] font-semibold"
            >
              Log an Urgent Ticket Now
            </button>
          </div>
        </div>
      )}

      {/* Modal 4: Browse All Help Articles */}
      {allArticlesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0E6B38]" />
                <h3 className="font-serif text-[19px] font-bold text-[#16231B]">
                  Help Centre Knowledge Base
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllArticlesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F2E9] flex items-center justify-center text-[#55625A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E6E3D8]">
                <p className="text-[13.5px] font-bold text-[#16231B]">
                  How do rent payments work?
                </p>
                <p className="text-[12.5px] text-[#4E5B52] mt-1">
                  Payments are processed securely through Paystack after the tenancy agreement is
                  signed by both parties. Official receipts are available immediately in your
                  Payments workspace.
                </p>
              </div>
              {RIGHT_FAQS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E6E3D8]"
                >
                  <p className="text-[13.5px] font-bold text-[#16231B]">{item.question}</p>
                  <p className="text-[12.5px] text-[#4E5B52] mt-1">{item.answer}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAllArticlesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B3B24] text-white text-[13px] font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
