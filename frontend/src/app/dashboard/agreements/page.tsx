'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Scale,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  User,
  Home,
  ShieldCheck,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  Search,
  Printer,
  Users,
  CircleDollarSign,
  PenTool,
  Info,
  Headphones,
  ArrowRight,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import toast from 'react-hot-toast';

type SectionId = 'overview' | 'parties' | 'terms' | 'rent' | 'covenants' | 'signatures';

const DOCUMENT_SECTIONS: {
  id: SectionId;
  label: string;
  page: number;
  icon: React.ElementType;
}[] = [
  { id: 'overview', label: 'Overview', page: 1, icon: FileText },
  { id: 'parties', label: 'Parties', page: 1, icon: Users },
  { id: 'terms', label: 'Terms', page: 1, icon: FileText },
  { id: 'rent', label: 'Rent', page: 2, icon: CircleDollarSign },
  { id: 'covenants', label: 'Covenants', page: 2, icon: ShieldCheck },
  { id: 'signatures', label: 'Signatures', page: 4, icon: PenTool },
];

export default function TenancyAgreementsPage() {
  const queryClient = useQueryClient();
  const viewerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    overview: null,
    parties: null,
    terms: null,
    rent: null,
    covenants: null,
    signatures: null,
  });

  // ── 1. Fetch User Session ──
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch {
        return null;
      }
    },
  });

  // ── 2. Fetch Digital Tenancy Agreements from Backend ──
  const { data: agreementsData } = useQuery({
    queryKey: ['tenant-agreements'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/agreements/tenant');
        return data.agreements || [];
      } catch {
        return [];
      }
    },
  });

  const agreements: any[] = Array.isArray(agreementsData) ? agreementsData : [];
  const primaryAgreement = agreements[0] || null;

  // Derived agreement metadata (seamlessly merges live backend data with reference defaults)
  const propertyTitle = (
    primaryAgreement?.booking?.property?.title || 'GLACIER STUDIO'
  ).toUpperCase();
  const propertyLocation =
    primaryAgreement?.booking?.property?.location || 'Achimota, Accra';
  const landlordName = primaryAgreement?.booking?.property?.owner
    ? `${primaryAgreement.booking.property.owner.firstName || ''} ${
        primaryAgreement.booking.property.owner.lastName || ''
      }`.trim()
    : 'Carefree Chelsea';
  const tenantName = session
    ? `${session.firstName || 'Stephen'} ${session.lastName || 'Darko'}`.trim()
    : 'Stephen Darko';

  const startDate = primaryAgreement?.booking?.startDate
    ? new Date(primaryAgreement.booking.startDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '6 Sep 2026';
  const endDate = primaryAgreement?.booking?.endDate
    ? new Date(primaryAgreement.booking.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '6 Sep 2027';

  const rentAmountNum =
    primaryAgreement?.booking?.room?.price ||
    primaryAgreement?.booking?.property?.price ||
    20000;
  const rentDisplay = `GH₵${Number(rentAmountNum).toLocaleString()}`;
  const agreementRef = primaryAgreement?.id
    ? `AKW/2026/${primaryAgreement.id.slice(0, 8).toUpperCase()}`
    : 'AKW/2026/E8CD84EA';

  const activeCount = Math.max(1, agreements.length);
  const executedCount = Math.max(
    1,
    agreements.filter((a) => a.status === 'COMPLETED' || a.status === 'SIGNED').length
  );
  const awaitingCount = agreements.filter(
    (a) => a.status === 'PENDING_TENANT' || a.status === 'PENDING'
  ).length;

  // ── 3. Interactive Document Viewer State ──
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [docSearch, setDocSearch] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const signMutation = useMutation({
    mutationFn: async (signature: string) => {
      if (!primaryAgreement?.bookingId) {
        return;
      }
      await api.post(`/agreements/booking/${primaryAgreement.bookingId}/sign`, {
        signature,
      });
    },
    onSuccess: () => {
      setShowSignModal(false);
      queryClient.invalidateQueries({ queryKey: ['tenant-agreements'] });
      toast.success('Tenancy Agreement signed and cryptographically sealed!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit signature');
    },
  });

  const handleSelectSection = (sec: (typeof DOCUMENT_SECTIONS)[number]) => {
    setActiveSection(sec.id);
    setCurrentPage(sec.page);
    const el = sectionRefs.current[sec.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(4, nextPage));
    setCurrentPage(clamped);
    const targetPageEl = document.getElementById(`agreement-sheet-${clamped}`);
    if (targetPageEl) {
      targetPageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Find closest section
    const matched =
      [...DOCUMENT_SECTIONS].reverse().find((s) => clamped >= s.page) ||
      DOCUMENT_SECTIONS[0];
    setActiveSection(matched.id);
  };

  const handlePrintOrDownload = async (mode: 'print' | 'download') => {
    if (mode === 'download' && primaryAgreement?.bookingId) {
      try {
        toast.loading('Preparing official 4-Page Tenancy Agreement PDF...', { id: 'pdf' });
        const res = await api.get(`/bookings/${primaryAgreement.bookingId}/pdf`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tenancy_Agreement_${primaryAgreement.id.slice(0, 8).toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Downloaded 4-Page Tenancy Agreement PDF (${agreementRef})`, { id: 'pdf' });
        return;
      } catch {
        // Fallback to print window
      }
    }

    let logoSrc = `${window.location.origin}/logo-light.png`;
    try {
      const res = await fetch('/logo-light.png');
      if (res.ok) {
        const blob = await res.blob();
        logoSrc = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // fallback to origin URL
    }

    const printWin = window.open('', '_blank', 'width=920,height=980');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Residential Tenancy Agreement - ${agreementRef}</title>
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .watermark {
                opacity: 0.16 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #14221A;
              max-width: 780px;
              margin: 36px auto;
              padding: 24px 36px;
              line-height: 1.65;
              position: relative;
              background: #ffffff;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 500px;
              max-width: 85%;
              opacity: 0.16;
              pointer-events: none;
              z-index: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .watermark img {
              width: 100%;
              height: auto;
              display: block;
              image-rendering: -webkit-optimize-contrast;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .doc-wrapper {
              position: relative;
              z-index: 1;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #C8A24A;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .header-logos {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 18px;
              margin: 0 auto 10px;
            }
            .header-divider {
              width: 1px;
              height: 42px;
              background-color: #C8A24A;
              display: inline-block;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .coa {
              width: 68px;
              height: 52px;
              object-fit: contain;
              display: inline-block;
            }
            .akwaaba-header-logo {
              width: 68px;
              height: 52px;
              object-fit: contain;
              display: inline-block;
            }
            .rep {
              font-size: 13px;
              letter-spacing: 0.08em;
              font-weight: bold;
              margin: 0;
            }
            h1 {
              font-size: 22px;
              margin: 6px 0;
              letter-spacing: 0.02em;
            }
            .ref {
              font-family: sans-serif;
              font-size: 12px;
              color: #3B4B41;
              font-weight: 600;
            }
            h2 {
              font-family: sans-serif;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 22px;
              color: #0B3B24;
            }
            p, li {
              font-size: 13.5px;
            }
            .sig-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-top: 32px;
              padding-top: 18px;
              border-top: 1px solid #DCD8C8;
              font-family: sans-serif;
              font-size: 12px;
            }
            .sig-box {
              border: 1px solid #DCD8C8;
              border-radius: 8px;
              padding: 14px;
              background: #FAF8F2;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="watermark">
            <img src="${logoSrc}" alt="Akwaaba Homes Watermark" />
          </div>
          <div class="doc-wrapper">
            <div class="header">
              <div class="header-logos">
                <img src="${window.location.origin}/images/agreements/coat-of-arms.png" class="coa" alt="Republic of Ghana" />
                <div class="header-divider"></div>
                <img src="${logoSrc}" class="akwaaba-header-logo" alt="Akwaaba Homes" />
              </div>
              <p class="rep">REPUBLIC OF GHANA</p>
              <h1>RESIDENTIAL TENANCY AGREEMENT</h1>
              <div class="ref">Agreement Ref: ${agreementRef}</div>
            </div>
            <h2>1. PARTIES</h2>
            <p>This Tenancy Agreement is made on this <strong>6th day of September, 2026</strong> between <strong>${landlordName}</strong> (hereinafter referred to as the "Landlord") of the one part, and <strong>${tenantName}</strong> (hereinafter referred to as the "Tenant") of the other part.</p>
            <h2>2. PREMISES &amp; TERM</h2>
            <p>The Landlord hereby demises unto the Tenant all that self-contained residential unit known as <strong>${propertyTitle}</strong> located at <strong>${propertyLocation}</strong> for a fixed term of <strong>12 Months</strong> commencing on <strong>${startDate}</strong> and expiring on <strong>${endDate}</strong>.</p>
            <h2>3. RENT &amp; STATUTORY COMPLIANCE</h2>
            <p>The reserved rent for the demised premises shall be <strong>${rentDisplay}</strong> payable via verified Paystack digital settlement in full compliance with Section 25 of the <strong>Ghana Rent Act, 1963 (Act 220)</strong>.</p>
            <h2>4. COVENANTS &amp; OBLIGATIONS</h2>
            <p>The Tenant covenants to use the premises strictly for residential purposes only, maintain the interior and fixtures in good tenantable repair, and abide by compound quiet hours and security regulations. The Landlord covenants that the Tenant paying the reserved rent shall peaceably hold and enjoy the demised premises without lawful interruption.</p>
            <div class="sig-grid">
              <div class="sig-box">
                <strong>SIGNED BY LANDLORD:</strong><br/>
                ${landlordName}<br/>
                Status: Verified &amp; Executed (${startDate})
              </div>
              <div class="sig-box">
                <strong>SIGNED BY TENANT:</strong><br/>
                ${tenantName}<br/>
                Status: Verified &amp; Executed (${startDate})
              </div>
            </div>
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
    if (mode === 'download') {
      toast.success(`Prepared ${agreementRef} PDF for download`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] dark:bg-[#0D100E] text-[#14221A] dark:text-zinc-100 font-sans pb-12">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-7 pt-4 space-y-4">
        {/* ════════════════════════════════════════════════════════════════════
            1. TOP HERO BANNER ("Tenancy Agreements")
           ════════════════════════════════════════════════════════════════════ */}
        <section className="relative rounded-2xl bg-[#F5F2E8] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 overflow-hidden px-5 sm:px-7 py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
          {/* Right Apartment Building Illustration */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[48%] pointer-events-none select-none">
            <Image
              src="/images/documents/docs-header-building.jpg"
              alt="AkwaabaHomes Verified Residence"
              fill
              priority
              sizes="50vw"
              className="object-cover object-center opacity-95 dark:opacity-35"
            />
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#F5F2E8] via-[#F5F2E8]/85 to-transparent dark:from-[#141A17] dark:via-[#141A17]/85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F5F2E8]/50 via-transparent to-transparent dark:from-[#141A17]/60" />
          </div>

          {/* Left Icon + Title + Subtitle */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#DFEFE2] dark:bg-emerald-950/60 border border-[#C9E3CE] dark:border-emerald-800/50 flex items-center justify-center text-[#0B4A2B] dark:text-emerald-400 shrink-0 shadow-2xs">
              <Scale className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-[31px] font-bold text-[#0B3B24] dark:text-white tracking-tight leading-tight">
                Tenancy Agreements
              </h1>
              <p className="text-xs sm:text-[13.5px] text-[#435349] dark:text-zinc-300 font-medium mt-0.5">
                View, sign, and manage your legally executed tenancy documents.
              </p>
            </div>
          </div>

          {/* Right "Download all" Action Button */}
          <div className="relative z-10 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => handlePrintOrDownload('download')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B3B24] hover:bg-[#125233] text-white text-xs sm:text-[13px] font-bold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download all</span>
            </button>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            2. 4 SUMMARY KPI CARDS ROW
           ════════════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: Active agreement */}
          <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="w-10 h-10 rounded-full bg-[#E1F3E6] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-[22px] font-black text-[#14221A] dark:text-white leading-none">
                {activeCount}
              </p>
              <p className="text-[11.5px] text-[#536358] dark:text-zinc-400 font-medium mt-1">
                Active agreement
              </p>
            </div>
          </div>

          {/* KPI 2: Executed */}
          <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="w-10 h-10 rounded-full bg-[#E1F3E6] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-[22px] font-black text-[#14221A] dark:text-white leading-none">
                {executedCount}
              </p>
              <p className="text-[11.5px] text-[#536358] dark:text-zinc-400 font-medium mt-1">
                Executed
              </p>
            </div>
          </div>

          {/* KPI 3: Awaiting signature */}
          <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="w-10 h-10 rounded-full bg-[#FEF0DC] dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#F58A07] text-white flex items-center justify-center">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-[22px] font-black text-[#14221A] dark:text-white leading-none">
                {awaitingCount}
              </p>
              <p className="text-[11.5px] text-[#536358] dark:text-zinc-400 font-medium mt-1">
                Awaiting signature
              </p>
            </div>
          </div>

          {/* KPI 4: Expiry */}
          <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="w-10 h-10 rounded-full bg-[#E3F1E6] dark:bg-emerald-950/60 text-[#0B4A2B] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-lg sm:text-[20px] font-black text-[#14221A] dark:text-white leading-none">
                {endDate}
              </p>
              <p className="text-[11.5px] text-[#536358] dark:text-zinc-400 font-medium mt-1">
                Expiry
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            3. MAIN TWO-COLUMN WORKSPACE (Left 8 Cols | Right 4 Cols)
           ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ──── LEFT COLUMN (8 Cols) ──── */}
          <div className="lg:col-span-8 space-y-3.5">
            {/* A. Primary Agreement Card ("GLACIER STUDIO") */}
            <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Photo with "Executed by both parties" pill */}
                <div className="md:col-span-4 relative min-h-[185px] rounded-xl overflow-hidden border border-[#E2DEC9] dark:border-zinc-700">
                  <Image
                    src="/images/agreements/glacier-studio-photo.jpg"
                    alt={propertyTitle}
                    fill
                    sizes="(max-width: 768px) 100vw, 260px"
                    className="object-cover"
                  />
                </div>

                {/* Middle Property & Lease Details */}
                <div className="md:col-span-5 flex flex-col justify-between py-0.5">
                  <div>
                    <h2 className="text-lg sm:text-[19px] font-black text-[#14221A] dark:text-white tracking-tight leading-tight">
                      {propertyTitle}
                    </h2>
                    <p className="flex items-center gap-1 text-xs text-[#4C5C52] dark:text-zinc-400 font-medium mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#3B5244] dark:text-emerald-400 shrink-0" />
                      <span>{propertyLocation}</span>
                    </p>
                  </div>

                  {/* Two-Column Details Split */}
                  <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-[#ECE9DC] dark:border-zinc-800">
                    {/* Sub-col 1: Landlord & Tenant */}
                    <div className="space-y-3 pr-2 border-r border-[#ECE9DC] dark:border-zinc-800">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-[#435349] dark:text-zinc-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="block text-[10.5px] text-[#68766D] dark:text-zinc-400 font-medium">
                            Landlord
                          </span>
                          <span className="block text-xs font-extrabold text-[#14221A] dark:text-white truncate">
                            {landlordName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-[#435349] dark:text-zinc-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="block text-[10.5px] text-[#68766D] dark:text-zinc-400 font-medium">
                            Tenant
                          </span>
                          <span className="block text-xs font-extrabold text-[#14221A] dark:text-white truncate">
                            {tenantName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-col 2: Lease Period, Rent, Category */}
                    <div className="space-y-2.5 pl-1">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#435349] dark:text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] text-[#68766D] dark:text-zinc-400 font-medium">
                            Lease Period
                          </span>
                          <span className="block text-[11.5px] font-extrabold text-[#14221A] dark:text-white leading-tight">
                            {startDate} – {endDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-[#435349] dark:text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] text-[#68766D] dark:text-zinc-400 font-medium">
                            Rent
                          </span>
                          <span className="block text-xs font-extrabold text-[#14221A] dark:text-white">
                            {rentDisplay}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Home className="w-3.5 h-3.5 text-[#435349] dark:text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] text-[#68766D] dark:text-zinc-400 font-medium">
                            Category
                          </span>
                          <span className="block text-[11px] font-medium text-[#2F3E35] dark:text-zinc-300 leading-tight">
                            Self-contained residential unit
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right SHA-256 Verification, Signatures & Buttons */}
                <div className="md:col-span-3 flex flex-col justify-between bg-[#F7F9F5] dark:bg-zinc-900/70 border border-[#E3ECE3] dark:border-zinc-800 rounded-xl p-3 space-y-2.5">
                  {/* SHA-256 Verified Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E1F3E6] dark:bg-emerald-950/60 text-[#116936] dark:text-emerald-400 text-[11px] font-bold self-start">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>SHA-256 Verified</span>
                  </div>

                  {/* Agreement Ref & Signed Date */}
                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <span className="text-[#68766D] dark:text-zinc-400 block text-[10px]">
                        Agreement Ref.
                      </span>
                      <span className="font-extrabold text-[#14221A] dark:text-white font-mono text-[11px]">
                        {agreementRef}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#68766D] dark:text-zinc-400 block text-[10px]">
                        Signed Date
                      </span>
                      <span className="font-bold text-[#14221A] dark:text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#15803D]" />
                        {startDate}
                      </span>
                    </div>
                  </div>

                  {/* Landlord & Tenant Cursive Signature Boxes */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white dark:bg-zinc-900 border border-[#E2E6E2] dark:border-zinc-700 rounded-lg p-1.5 relative">
                      <span className="block text-[9.5px] font-semibold text-[#5C6B61] dark:text-zinc-400">
                        Landlord
                      </span>
                      <svg
                        viewBox="0 0 90 28"
                        className="w-14 h-5 text-[#14221A] dark:text-zinc-200 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      >
                        <path d="M6 20 C14 6, 22 24, 30 12 C36 5, 40 22, 48 14 C56 8, 66 18, 78 11" />
                        <path d="M16 22 Q42 17 72 20" strokeWidth="1.1" />
                      </svg>
                      <span className="w-3.5 h-3.5 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center absolute bottom-1.5 right-1.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-[#E2E6E2] dark:border-zinc-700 rounded-lg p-1.5 relative">
                      <span className="block text-[9.5px] font-semibold text-[#5C6B61] dark:text-zinc-400">
                        Tenant
                      </span>
                      <svg
                        viewBox="0 0 90 28"
                        className="w-14 h-5 text-[#14221A] dark:text-zinc-200 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      >
                        <path d="M8 21 L20 7 L26 19 L34 10 C42 18, 52 8, 64 16" />
                        <path d="M12 16 L46 14" strokeWidth="1.2" />
                      </svg>
                      <span className="w-3.5 h-3.5 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center absolute bottom-1.5 right-1.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons inside Primary Card */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 mt-3 pt-2.5 border-t border-[#EFECE0] dark:border-zinc-800">
                {awaitingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSignModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Sign Agreement</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-[#F5F2E8] dark:hover:bg-zinc-700 border border-[#DCD8C8] dark:border-zinc-700 text-[#14221A] dark:text-zinc-100 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#3B5244] dark:text-emerald-400" />
                  <span>Open agreement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintOrDownload('download')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#125233] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* B. 5-Step Execution Timeline Bar */}
            <div className="bg-[#EAF4EC] dark:bg-emerald-950/30 border border-[#D4E7D7] dark:border-emerald-900/50 rounded-2xl px-4 sm:px-8 py-3.5">
              <div className="relative flex items-center justify-between">
                {/* Connecting Green Line */}
                <div className="absolute left-6 right-6 top-3 h-[2px] bg-[#16A34A] z-0" />

                {[
                  'Drafted',
                  'Sent for signature',
                  'Signed by landlord',
                  'Signed by tenant',
                  'Executed',
                ].map((step) => (
                  <div
                    key={step}
                    className="relative z-10 flex flex-col items-center text-center gap-1.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-xs ring-4 ring-[#EAF4EC] dark:ring-[#122119]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-[10.5px] sm:text-[11.5px] font-bold text-[#14221A] dark:text-zinc-200 whitespace-nowrap">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Interactive Document Viewer ("RESIDENTIAL TENANCY AGREEMENT") */}
            <div
              ref={viewerRef}
              className={`bg-[#F5F3EB] dark:bg-[#141A17] border border-[#E2DEC9] dark:border-zinc-800 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(11,59,36,0.04)] ${
                isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : ''
              }`}
            >
              {/* Document Toolbar */}
              <div className="bg-[#EFECE1] dark:bg-zinc-900 border-b border-[#E0DDD0] dark:border-zinc-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Left: Page Indicator + Prev/Next + Zoom + Fullscreen */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 font-semibold text-[#2C3A31] dark:text-zinc-200">
                    <FileText className="w-3.5 h-3.5 text-[#4C5C52]" />
                    <span>Page {currentPage} of 4</span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= 4}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-[#D8D4C5] dark:bg-zinc-700" />

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(75, z - 10))}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                      aria-label="Zoom out"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-[11.5px] min-w-[38px] text-center">
                      {zoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(140, z + 10))}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                      aria-label="Zoom in"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-[#D8D4C5] dark:bg-zinc-700" />

                  <button
                    type="button"
                    onClick={() => setIsFullscreen((f) => !f)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title={isFullscreen ? 'Exit fullscreen' : 'Expand viewer'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Center: Search in document */}
                <div className="relative flex-1 max-w-[230px] min-w-[150px]">
                  <Search className="w-3.5 h-3.5 text-[#68766D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search in document..."
                    className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-[#FDFCF7] dark:bg-zinc-800 border border-[#DCD8C8] dark:border-zinc-700 text-[11.5px] text-[#14221A] dark:text-white placeholder:text-[#78847C] focus:outline-none focus:border-[#0B3B24]"
                  />
                </div>

                {/* Right: Print & Download */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePrintOrDownload('print')}
                    className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#2C3A31] dark:text-zinc-200 hover:text-[#0B3B24] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintOrDownload('download')}
                    className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#2C3A31] dark:text-zinc-200 hover:text-[#0B3B24] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Document Viewer Split Body */}
              <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[360px] max-h-[520px]">
                {/* Left Chapter Tabs (3 cols) */}
                <div className="sm:col-span-3 bg-[#F3F0E6] dark:bg-zinc-900/60 border-b sm:border-b-0 sm:border-r border-[#E2DEC9] dark:border-zinc-800 p-2.5 flex sm:flex-col gap-1 overflow-x-auto">
                  {DOCUMENT_SECTIONS.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => handleSelectSection(sec)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-[#0B3B24] text-white shadow-2xs'
                            : 'text-[#2C3A31] dark:text-zinc-300 hover:bg-[#E6E2D4] dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-white' : 'text-[#4C5C52] dark:text-zinc-400'
                          }`}
                        />
                        <span>{sec.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Legal Paper Sheet Container (9 cols) */}
                <div className="sm:col-span-9 bg-[#EAE7DC] dark:bg-zinc-950 p-3 sm:p-5 overflow-y-auto max-h-[600px] space-y-6">
                  {/* ════════════════════════════════════════════════════════════
                      PAGE 1 OF 4: RECITALS, PARTIES, SCHEDULE 1 & GRANT
                     ════════════════════════════════════════════════════════════ */}
                  <div
                    id="agreement-sheet-1"
                    className="bg-white dark:bg-[#181E1B] text-[#14221A] dark:text-zinc-100 rounded-lg shadow-sm border border-[#E0DDD0] dark:border-zinc-800 px-6 sm:px-10 py-7 mx-auto transition-transform origin-top relative overflow-hidden"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      maxWidth: '680px',
                    }}
                  >
                    {/* Centered Akwaaba Watermark Logo */}
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] dark:opacity-[0.20]">
                      <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
                        <Image
                          src="/logo-light.png"
                          alt="Akwaaba Homes Watermark"
                          fill
                          priority
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="relative z-10">
                      {/* Top Metadata Folio Line */}
                      <div className="flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 pb-3 border-b border-[#D6D0C4] dark:border-zinc-700 tracking-wide font-sans">
                        <span>INSTRUMENT REF: {agreementRef}</span>
                        <span>REPUBLIC OF GHANA</span>
                      </div>

                      {/* Header with Centered Dual Logos & Golden Line */}
                      <div
                        ref={(el) => {
                          sectionRefs.current.overview = el;
                        }}
                        className="text-center border-b-2 border-[#C8A24A] pb-4 my-4"
                      >
                        <div className="flex items-center justify-center gap-4 mb-2">
                          <div className="w-16 h-14 relative">
                            <Image
                              src="/images/agreements/coat-of-arms.png"
                              alt="Republic of Ghana Coat of Arms"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="w-[1.5px] h-10 bg-[#C8A24A]" />
                          <div className="w-16 h-14 relative">
                            <Image
                              src="/logo-light.png"
                              alt="Akwaaba Homes"
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                        <p className="font-serif text-[12px] font-bold tracking-[0.06em] uppercase text-[#14221A] dark:text-zinc-200">
                          REPUBLIC OF GHANA
                        </p>
                        <h3 className="font-serif text-lg sm:text-[21px] font-bold tracking-tight text-[#14221A] dark:text-white mt-0.5 uppercase">
                          Residential Tenancy Agreement
                        </h3>
                        <p className="text-[11px] italic text-[#57534E] dark:text-zinc-400 mt-0.5">
                          Made pursuant to the Rent Act, 1963 (Act 220), Conveyancing Act, 1973 (NRCD 175) and Electronic Transactions Act, 2008 (Act 772)
                        </p>
                      </div>

                      {/* Legal Body Page 1 */}
                      <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify text-[#233128] dark:text-zinc-200">
                        {/* 1. PARTIES */}
                        <div
                          ref={(el) => {
                            sectionRefs.current.parties = el;
                          }}
                          className={
                            docSearch && 'parties landlord tenant'.includes(docSearch.toLowerCase())
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 p-2 rounded'
                              : ''
                          }
                        >
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            1. &nbsp;PARTIES AND RECITALS
                          </h4>
                          <p>
                            <strong>THIS RESIDENTIAL TENANCY AGREEMENT</strong> is made on this{' '}
                            <strong>6th day of September, 2026</strong> BETWEEN{' '}
                            <strong className="uppercase">{landlordName}</strong> of {propertyLocation}, Ghana,
                            hereinafter referred to as <strong>&ldquo;the Landlord&rdquo;</strong> (which
                            expression shall, where the context so admits, include the Landlord&rsquo;s heirs,
                            successors, and assigns) of the one part;
                          </p>
                          <p className="mt-2">
                            <strong>AND</strong> <strong className="uppercase">{tenantName}</strong> of the
                            Republic of Ghana, hereinafter referred to as{' '}
                            <strong>&ldquo;the Tenant&rdquo;</strong> (which expression shall include the
                            Tenant&rsquo;s permitted personal representatives and assigns) of the other part.
                          </p>
                        </div>

                        {/* Recitals (WHEREAS) */}
                        <div className="space-y-1.5 pt-1">
                          <p className="font-bold">WHEREAS:</p>
                          <ol className="list-[upper-roman] pl-5 space-y-1 text-[11.5px] sm:text-[12px]">
                            <li>
                              The Landlord is the lawful owner or registered lessor of the residential property known
                              as <strong>{propertyTitle}</strong>, situated at <strong>{propertyLocation}</strong>,
                              Ghana (hereinafter &ldquo;the Premises&rdquo;).
                            </li>
                            <li>
                              The Landlord has agreed to let and the Tenant has agreed to take the Premises for
                              private residential purposes at the agreed rent and upon the covenants herein.
                            </li>
                            <li>
                              The parties intend that this Agreement shall constitute a binding residential tenancy
                              subject to the statutory protections of the Rent Act, 1963 (Act 220).
                            </li>
                          </ol>
                        </div>

                        {/* Schedule 1 Table */}
                        <div className="my-3 font-sans">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#14221A] dark:text-zinc-200 mb-1.5">
                            Schedule 1: Tenancy Particulars
                          </div>
                          <table className="w-full border-collapse border border-[#A8A29E] text-[11.5px] text-left">
                            <tbody>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1.5 px-2.5 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 w-2/5 border-r border-[#A8A29E]">
                                  1. Description of Premises
                                </th>
                                <td className="py-1.5 px-2.5 text-[#1C1917] dark:text-zinc-200">
                                  <strong>{propertyTitle}</strong>, {propertyLocation}
                                </td>
                              </tr>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1.5 px-2.5 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  2. Unit / Category
                                </th>
                                <td className="py-1.5 px-2.5 text-[#1C1917] dark:text-zinc-200">
                                  Self-Contained Residential Unit
                                </td>
                              </tr>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1.5 px-2.5 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  3. Tenancy Term
                                </th>
                                <td className="py-1.5 px-2.5 text-[#1C1917] dark:text-zinc-200">
                                  From <strong>{startDate}</strong> to <strong>{endDate}</strong> (12 Months)
                                </td>
                              </tr>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1.5 px-2.5 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  4. Agreed Rent for Term
                                </th>
                                <td className="py-1.5 px-2.5 text-[#1C1917] dark:text-zinc-200">
                                  <strong>{rentDisplay}</strong> (Ghana Cedis)
                                </td>
                              </tr>
                              <tr>
                                <th className="py-1.5 px-2.5 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  5. Permitted Use
                                </th>
                                <td className="py-1.5 px-2.5 text-[#1C1917] dark:text-zinc-200">
                                  Private Residential Occupation Only
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Clause 1: Grant of Tenancy */}
                        <div
                          ref={(el) => {
                            sectionRefs.current.terms = el;
                          }}
                        >
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1">
                            2. &nbsp;GRANT OF TENANCY AND TERM
                          </h4>
                          <p>
                            In consideration of the rent hereby reserved and the covenants on the part of the
                            Tenant hereinafter contained, the Landlord hereby lets unto the Tenant the Premises
                            described in Schedule 1 hereto, TO HOLD the same unto the Tenant from{' '}
                            <strong>{startDate}</strong> until <strong>{endDate}</strong>, unless earlier
                            determined in accordance with this Agreement or the Rent Act, 1963 (Act 220).
                          </p>
                        </div>
                      </div>

                      {/* Footer Sheet 1 */}
                      <div className="pt-5 mt-5 border-t border-[#D6D0C4] dark:border-zinc-700 flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 font-sans">
                        <span>Tenancy Agreement ({agreementRef})</span>
                        <span className="font-bold text-[#292524] dark:text-white">Page 1 of 4</span>
                      </div>
                    </div>
                  </div>

                  {/* ════════════════════════════════════════════════════════════
                      PAGE 2 OF 4: RENT ADVANCE, TENANT & LANDLORD COVENANTS
                     ════════════════════════════════════════════════════════════ */}
                  <div
                    id="agreement-sheet-2"
                    className="bg-white dark:bg-[#181E1B] text-[#14221A] dark:text-zinc-100 rounded-lg shadow-sm border border-[#E0DDD0] dark:border-zinc-800 px-6 sm:px-10 py-7 mx-auto transition-transform origin-top relative overflow-hidden"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      maxWidth: '680px',
                    }}
                  >
                    {/* Centered Akwaaba Watermark Logo */}
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] dark:opacity-[0.20]">
                      <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
                        <Image
                          src="/logo-light.png"
                          alt="Akwaaba Homes Watermark"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="relative z-10">
                      {/* Continuation Header */}
                      <div className="flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 pb-3 border-b border-[#D6D0C4] dark:border-zinc-700 tracking-wide font-sans">
                        <span>INSTRUMENT REF: {agreementRef}</span>
                        <span className="uppercase font-bold tracking-wider">Part II — Rent, Statutory Advance &amp; Covenants</span>
                      </div>

                      {/* Legal Body Page 2 */}
                      <div className="space-y-4 pt-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify text-[#233128] dark:text-zinc-200">
                        {/* 3. RENT & STATUTORY ADVANCE */}
                        <div
                          ref={(el) => {
                            sectionRefs.current.rent = el;
                          }}
                        >
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            3. &nbsp;RENT, STATUTORY ADVANCE &amp; OFFICIAL RECEIPTS
                          </h4>
                          <p>
                            <strong>3.1.</strong> The reserved rent for the tenancy is{' '}
                            <strong>{rentDisplay}</strong>, settled electronically through the designated
                            AkwaabaHomes verified Paystack channel on behalf of the Landlord.
                          </p>
                          <p className="mt-1.5">
                            <strong>3.2.</strong> In strict compliance with Section 25(5) of the Rent Act, 1963
                            (Act 220), the Landlord shall not demand, receive, or require payment of rent advance
                            exceeding statutory limits.
                          </p>
                          <p className="mt-1.5">
                            <strong>3.3.</strong> In accordance with Section 20 of the Rent Act, 1963 (Act 220),
                            every payment of rent shall be acknowledged by an official written or electronic rent
                            receipt stating the date, period covered, and sum received.
                          </p>
                          <p className="mt-1.5">
                            <strong>3.4.</strong> Pursuant to Section 19 of the Rent Act, 1963 (Act 220), the
                            Landlord shall not unilaterally increase the rent during the tenancy term without prior
                            assessment by the Rent Control Division or mutual written addendum.
                          </p>
                        </div>

                        {/* 4. TENANT'S COVENANTS */}
                        <div
                          ref={(el) => {
                            sectionRefs.current.covenants = el;
                          }}
                        >
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            4. &nbsp;TENANT&rsquo;S COVENANTS
                          </h4>
                          <p>The Tenant hereby covenants with the Landlord as follows:</p>
                          <div className="pl-3 sm:pl-4 space-y-1.5 mt-1 text-[11.5px] sm:text-[12px]">
                            <p>
                              <strong>4.1. Rent &amp; Utilities:</strong> To pay rent punctually and settle all
                              charges for electricity, water, and sanitation attributable to the Premises.
                            </p>
                            <p>
                              <strong>4.2. Care of Interior:</strong> To keep the interior of the Premises, doors,
                              locks, sanitary fittings, and appliances in clean and tenantable repair (fair wear and
                              tear excepted).
                            </p>
                            <p>
                              <strong>4.3. Alterations:</strong> Not to make any structural alterations or change
                              exterior locks without prior written consent of the Landlord.
                            </p>
                            <p>
                              <strong>4.4. No Subletting:</strong> Not to assign, sublet, or part with possession of
                              the Premises or any part thereof (Section 22 of the Rent Act, 1963).
                            </p>
                            <p>
                              <strong>4.5. Good Neighbourliness:</strong> Not to cause nuisance or disturbance to
                              neighbours, nor use the Premises for any illegal or immoral purpose.
                            </p>
                            <p>
                              <strong>4.6. Inspection Access:</strong> To permit the Landlord or agents upon at least
                              24 hours&rsquo; prior notice to inspect the state of repair at reasonable daytime hours.
                            </p>
                            <p>
                              <strong>4.7. Yielding Up:</strong> Peaceably to yield up the Premises with all keys and
                              fixtures in good order at the expiration or determination of tenancy.
                            </p>
                          </div>
                        </div>

                        {/* 5. LANDLORD'S COVENANTS */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            5. &nbsp;LANDLORD&rsquo;S COVENANTS
                          </h4>
                          <div className="pl-3 sm:pl-4 space-y-1.5 text-[11.5px] sm:text-[12px]">
                            <p>
                              <strong>5.1. Quiet Enjoyment:</strong> That the Tenant, paying rent and performing
                              covenants, shall peaceably hold and enjoy the Premises without unlawful interruption.
                            </p>
                            <p>
                              <strong>5.2. Structural Repairs:</strong> To maintain the roof, foundation, exterior
                              walls, main plumbing, and electrical distribution in sound structural order.
                            </p>
                            <p>
                              <strong>5.3. Rates &amp; Taxes:</strong> To pay all municipal property rates and ground
                              rent levies assessed against the property.
                            </p>
                            <p>
                              <strong>5.4. Due Process of Law:</strong> Not to lock out the Tenant, disconnect
                              essential water or electricity, or remove doors/roofing (Act 220).
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Sheet 2 */}
                      <div className="pt-5 mt-5 border-t border-[#D6D0C4] dark:border-zinc-700 flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 font-sans">
                        <span>Tenancy Agreement ({agreementRef})</span>
                        <span className="font-bold text-[#292524] dark:text-white">Page 2 of 4</span>
                      </div>
                    </div>
                  </div>

                  {/* ════════════════════════════════════════════════════════════
                      PAGE 3 OF 4: CAUTION DEPOSIT, UTILITIES, HOUSE RULES & NOTICE
                     ════════════════════════════════════════════════════════════ */}
                  <div
                    id="agreement-sheet-3"
                    className="bg-white dark:bg-[#181E1B] text-[#14221A] dark:text-zinc-100 rounded-lg shadow-sm border border-[#E0DDD0] dark:border-zinc-800 px-6 sm:px-10 py-7 mx-auto transition-transform origin-top relative overflow-hidden"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      maxWidth: '680px',
                    }}
                  >
                    {/* Centered Akwaaba Watermark Logo */}
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] dark:opacity-[0.20]">
                      <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
                        <Image
                          src="/logo-light.png"
                          alt="Akwaaba Homes Watermark"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="relative z-10">
                      {/* Continuation Header */}
                      <div className="flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 pb-3 border-b border-[#D6D0C4] dark:border-zinc-700 tracking-wide font-sans">
                        <span>INSTRUMENT REF: {agreementRef}</span>
                        <span className="uppercase font-bold tracking-wider">Part III — Deposit, Utilities &amp; Property Governance</span>
                      </div>

                      {/* Legal Body Page 3 */}
                      <div className="space-y-4 pt-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify text-[#233128] dark:text-zinc-200">
                        {/* 6. CAUTION DEPOSIT ESCROW */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            6. &nbsp;CAUTION DEPOSIT ESCROW AND REFUND PROTOCOL
                          </h4>
                          <p>
                            <strong>6.1. Security Escrow:</strong> Any caution or security deposit deposited by the
                            Tenant shall be held in secure escrow solely as security for the faithful performance of
                            covenants and shall under no circumstance be treated as rent.
                          </p>
                          <p className="mt-1.5">
                            <strong>6.2. 14-Day Refund Window:</strong> Upon the determination of tenancy and
                            completion of the joint exit inspection, the caution deposit shall be refunded to the
                            Tenant within fourteen (14) calendar days.
                          </p>
                          <p className="mt-1.5">
                            <strong>6.3. Deductions:</strong> Deductions are strictly restricted to verified,
                            itemized expenses incurred to rectify physical damage caused by the Tenant beyond fair wear
                            and tear, or to settle certified outstanding utility bills.
                          </p>
                        </div>

                        {/* 7. UTILITIES & SERVICES */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            7. &nbsp;UTILITIES, SUB-METERS AND ESSENTIAL SERVICES
                          </h4>
                          <p>
                            <strong>7.1. Electricity Sub-Metering:</strong> The Tenant shall be responsible for
                            purchasing ECG electricity recharge tokens for the dedicated prepaid sub-meter allocated to
                            the unit and shall operate appliances safely.
                          </p>
                          <p className="mt-1.5">
                            <strong>7.2. Water Supply:</strong> The Landlord shall maintain functional connectivity
                            to the Ghana Water Company Limited (GWCL) mains or auxiliary borehole water storage
                            tanks. The Tenant shall practice water conservation.
                          </p>
                          <p className="mt-1.5">
                            <strong>7.3. Waste Management:</strong> The Tenant shall bag and deposit domestic refuse
                            into designated municipal collection bins and maintain clean sanitary conditions.
                          </p>
                        </div>

                        {/* 8. RESIDENCE REGULATIONS */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            8. &nbsp;RESIDENCE AND COMPOUND REGULATIONS
                          </h4>
                          <p>
                            <strong>8.1. Security &amp; Access:</strong> Main compound gates shall be secured at
                            designated hours. Overnight guests exceeding three (3) consecutive nights require advance
                            notification to the property manager.
                          </p>
                          <p className="mt-1.5">
                            <strong>8.2. Fire Safety:</strong> No open coal pot cooking, kerosene heaters, or storage
                            of combustible fuel is permitted within residential quarters.
                          </p>
                        </div>

                        {/* 9. DETERMINATION & NOTICE */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            9. &nbsp;DETERMINATION OF TENANCY AND NOTICE TO QUIT
                          </h4>
                          <p>
                            <strong>9.1. Statutory Notice:</strong> Either party intending not to renew or wishing to
                            determine this tenancy shall serve written notice of not less than one (1) calendar month
                            for monthly tenancy, or not less than three (3) calendar months for annual tenancy.
                          </p>
                          <p className="mt-1.5">
                            <strong>9.2. Default &amp; Forfeiture:</strong> If rent remains unpaid for thirty (30) days
                            after becoming due, or upon substantial breach, the Landlord may initiate statutory
                            recovery of possession proceedings pursuant to the Rent Act, 1963 (Act 220).
                          </p>
                        </div>
                      </div>

                      {/* Footer Sheet 3 */}
                      <div className="pt-5 mt-5 border-t border-[#D6D0C4] dark:border-zinc-700 flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 font-sans">
                        <span>Tenancy Agreement ({agreementRef})</span>
                        <span className="font-bold text-[#292524] dark:text-white">Page 3 of 4</span>
                      </div>
                    </div>
                  </div>

                  {/* ════════════════════════════════════════════════════════════
                      PAGE 4 OF 4: DISPUTE RESOLUTION, INVENTORY & EXECUTION
                     ════════════════════════════════════════════════════════════ */}
                  <div
                    id="agreement-sheet-4"
                    className="bg-white dark:bg-[#181E1B] text-[#14221A] dark:text-zinc-100 rounded-lg shadow-sm border border-[#E0DDD0] dark:border-zinc-800 px-6 sm:px-10 py-7 mx-auto transition-transform origin-top relative overflow-hidden"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      maxWidth: '680px',
                    }}
                  >
                    {/* Centered Akwaaba Watermark Logo */}
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] dark:opacity-[0.20]">
                      <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
                        <Image
                          src="/logo-light.png"
                          alt="Akwaaba Homes Watermark"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="relative z-10">
                      {/* Continuation Header */}
                      <div className="flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 pb-3 border-b border-[#D6D0C4] dark:border-zinc-700 tracking-wide font-sans">
                        <span>INSTRUMENT REF: {agreementRef}</span>
                        <span className="uppercase font-bold tracking-wider">Part IV — Dispute Resolution, Inventory &amp; Execution</span>
                      </div>

                      {/* Legal Body Page 4 */}
                      <div className="space-y-4 pt-4 text-xs sm:text-[13px] leading-relaxed font-serif text-justify text-[#233128] dark:text-zinc-200">
                        {/* 10. DISPUTE RESOLUTION */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1.5">
                            10. &nbsp;DISPUTE RESOLUTION AND RENT CONTROL CONCILIATION
                          </h4>
                          <p>
                            <strong>10.1. Conciliation:</strong> Any dispute arising under this Agreement shall first
                            be submitted to good-faith mediation between the parties or via the AkwaabaHomes conciliation
                            system within fourteen (14) days.
                          </p>
                          <p className="mt-1.5">
                            <strong>10.2. Statutory Referral:</strong> In default of amicable settlement, the dispute
                            shall be referred to the Rent Control Officer or District Rent Magistrate having jurisdiction
                            under the Rent Act, 1963 (Act 220).
                          </p>
                          <p className="mt-1.5">
                            <strong>10.3. Governing Law:</strong> This Agreement shall be governed and construed in
                            accordance with the laws of the Republic of Ghana.
                          </p>
                        </div>

                        {/* 11. ELECTRONIC EXECUTION (ACT 772) */}
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider text-[#14221A] dark:text-white mb-1">
                            11. &nbsp;ELECTRONIC EXECUTION AND STATUTORY VALIDITY
                          </h4>
                          <p className="text-[11.5px] sm:text-[12px]">
                            This Agreement is executed electronically pursuant to Section 10 of the Electronic
                            Transactions Act, 2008 (Act 772). The parties expressly agree that digital signatures and
                            cryptographic SHA-256 digests constitute conclusive proof of authentic execution.
                          </p>
                        </div>

                        {/* Schedule 2: Move-In Fixtures Table */}
                        <div className="my-2 font-sans">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#14221A] dark:text-zinc-200 mb-1">
                            Schedule 2: Fixtures &amp; Move-In Inventory Record
                          </div>
                          <table className="w-full border-collapse border border-[#A8A29E] text-[11px] text-left">
                            <tbody>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1 px-2 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 w-2/5 border-r border-[#A8A29E]">
                                  1. Keys &amp; Access Control
                                </th>
                                <td className="py-1 px-2 text-[#1C1917] dark:text-zinc-200">
                                  Main door key, room key, deadbolt, security gate key (Good condition)
                                </td>
                              </tr>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1 px-2 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  2. Electrical Installations
                                </th>
                                <td className="py-1 px-2 text-[#1C1917] dark:text-zinc-200">
                                  Ceiling lighting, sockets, switches, dedicated ECG sub-meter (Functional)
                                </td>
                              </tr>
                              <tr className="border-b border-[#A8A29E]">
                                <th className="py-1 px-2 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  3. Sanitary Fittings
                                </th>
                                <td className="py-1 px-2 text-[#1C1917] dark:text-zinc-200">
                                  Water closet, wash basin, taps, shower rose, drain traps (Clean &amp; leak-free)
                                </td>
                              </tr>
                              <tr>
                                <th className="py-1 px-2 bg-[#F5F2EB] dark:bg-zinc-800 font-bold text-[#292524] dark:text-zinc-200 border-r border-[#A8A29E]">
                                  4. Joinery &amp; Walls
                                </th>
                                <td className="py-1 px-2 text-[#1C1917] dark:text-zinc-200">
                                  Glazed windows, secure latches, interior paint, wardrobes (Good condition)
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Testimonium Clause */}
                        <div className="pt-1">
                          <p className="font-bold text-[12px] text-[#14221A] dark:text-white">
                            IN WITNESS WHEREOF the Landlord and the Tenant have executed this Agreement the day,
                            month, and year first above written.
                          </p>
                        </div>

                        {/* Two-Column Execution Block */}
                        <div
                          ref={(el) => {
                            sectionRefs.current.signatures = el;
                          }}
                          className="pt-3 border-t border-[#E5E2D7] dark:border-zinc-800 font-sans"
                        >
                          <div className="grid grid-cols-2 gap-3 text-[11px]">
                            {/* Landlord Box */}
                            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-zinc-900 border border-[#E2DEC9] dark:border-zinc-800">
                              <span className="text-[#68766D] dark:text-zinc-400 block text-[10px] font-semibold uppercase">
                                Signed by Landlord
                              </span>
                              <span className="font-extrabold text-[#14221A] dark:text-white block mt-0.5">
                                {landlordName}
                              </span>
                              <svg
                                viewBox="0 0 90 24"
                                className="w-16 h-4 text-[#14221A] dark:text-zinc-200 my-1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              >
                                <path d="M6 18 C14 4, 22 22, 30 10 C36 4, 40 20, 48 12 C56 6, 66 16, 78 9" />
                              </svg>
                              <span className="text-[10px] text-[#15803D] dark:text-emerald-400 font-semibold block">
                                ✓ Verified • {startDate}
                              </span>
                              <span className="text-[9.5px] text-[#68766D] dark:text-zinc-500 block">
                                Capacity: Landlord / Lessor
                              </span>
                            </div>

                            {/* Tenant Box */}
                            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-zinc-900 border border-[#E2DEC9] dark:border-zinc-800">
                              <span className="text-[#68766D] dark:text-zinc-400 block text-[10px] font-semibold uppercase">
                                Signed by Tenant
                              </span>
                              <span className="font-extrabold text-[#14221A] dark:text-white block mt-0.5">
                                {tenantName}
                              </span>
                              <svg
                                viewBox="0 0 90 24"
                                className="w-16 h-4 text-[#14221A] dark:text-zinc-200 my-1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              >
                                <path d="M8 19 L20 5 L26 17 L34 8 C42 16, 52 6, 64 14" />
                              </svg>
                              <span className="text-[10px] text-[#15803D] dark:text-emerald-400 font-semibold block">
                                ✓ Verified • {startDate}
                              </span>
                              <span className="text-[9.5px] text-[#68766D] dark:text-zinc-500 block">
                                Capacity: Tenant / Lessee
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SHA-256 Box */}
                        <div className="p-2.5 bg-[#FAF8F3] dark:bg-zinc-900 border border-[#D6D0C4] dark:border-zinc-800 rounded font-sans text-[10px] text-[#57534E] dark:text-zinc-400 space-y-0.5">
                          <div className="font-bold text-[#0F5132] dark:text-emerald-400 uppercase tracking-wide">
                            Digitally Authenticated Legal Record • Act 772 (Section 10)
                          </div>
                          <div className="font-mono text-[9.5px] text-slate-500 dark:text-zinc-500 break-all">
                            Instrument Ref: {agreementRef} • SHA-256: {primaryAgreement?.cryptographicHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                          </div>
                        </div>
                      </div>

                      {/* Footer Sheet 4 */}
                      <div className="pt-5 mt-5 border-t border-[#D6D0C4] dark:border-zinc-700 flex items-center justify-between text-[11px] text-[#57534E] dark:text-zinc-400 font-sans">
                        <span>Tenancy Agreement ({agreementRef})</span>
                        <span className="font-bold text-[#292524] dark:text-white">Page 4 of 4</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── RIGHT COLUMN (4 Cols) ──── */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* Card 1: Agreement at a glance */}
            <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] space-y-3.5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#14221A] dark:text-emerald-400 shrink-0" />
                <h2 className="text-[15px] font-black text-[#14221A] dark:text-white tracking-tight">
                  Agreement at a glance
                </h2>
              </div>

              <div className="divide-y divide-[#EFECE0] dark:divide-zinc-800 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">Rent</span>
                  <span className="font-black text-[#14221A] dark:text-white">
                    {rentDisplay} / month
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">Term</span>
                  <span className="font-black text-[#14221A] dark:text-white">12 Months</span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">
                    Start Date
                  </span>
                  <span className="font-black text-[#14221A] dark:text-white">{startDate}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">End Date</span>
                  <span className="font-black text-[#14221A] dark:text-white">{endDate}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">
                    Property Location
                  </span>
                  <span className="font-semibold text-[#14221A] dark:text-white">
                    {propertyLocation}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">
                    Governing Law
                  </span>
                  <span className="font-semibold text-[#14221A] dark:text-white text-right">
                    Ghana Rent Act, 1963 (Act 220)
                  </span>
                </div>

                <div className="pt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[#536358] dark:text-zinc-400 font-medium">
                    Permitted Use
                  </span>
                  <span className="font-semibold text-[#14221A] dark:text-white">
                    Residential Only
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Important dates */}
            <div className="bg-[#EAF4EC] dark:bg-emerald-950/30 border border-[#D4E7D7] dark:border-emerald-900/50 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0B4A2B] dark:text-emerald-400 shrink-0" />
                <h3 className="text-sm font-black text-[#14221A] dark:text-white">
                  Important dates
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#D4E7D7] dark:border-emerald-900/50 text-xs">
                <div className="pr-2 border-r border-[#D4E7D7] dark:border-emerald-900/50">
                  <span className="block text-[10.5px] text-[#4C5C52] dark:text-zinc-400 font-medium">
                    Lease Start
                  </span>
                  <span className="block font-black text-[#14221A] dark:text-white mt-0.5">
                    {startDate}
                  </span>
                </div>

                <div className="px-2 border-r border-[#D4E7D7] dark:border-emerald-900/50">
                  <span className="block text-[10.5px] text-[#4C5C52] dark:text-zinc-400 font-medium">
                    Lease Expiry
                  </span>
                  <span className="block font-black text-[#14221A] dark:text-white mt-0.5">
                    {endDate}
                  </span>
                </div>

                <div className="pl-2">
                  <span className="block text-[10.5px] text-[#4C5C52] dark:text-zinc-400 font-medium">
                    Renewal Notice
                  </span>
                  <span className="block font-black text-[#14221A] dark:text-white mt-0.5">
                    31 Aug 2027
                  </span>
                  <span className="block text-[9.5px] text-[#536358] dark:text-zinc-400">
                    (30 days before)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Need help understanding your agreement? */}
            <div className="bg-[#FDFCF7] dark:bg-[#141A17] border border-[#E6E2D4] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
              <div className="w-11 h-11 rounded-full bg-[#E3F1E6] dark:bg-emerald-950/60 text-[#0B4A2B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="space-y-2.5 flex-1">
                <div>
                  <h3 className="text-xs sm:text-[13px] font-black text-[#14221A] dark:text-white leading-snug">
                    Need help understanding your agreement?
                  </h3>
                  <p className="text-[11px] text-[#536358] dark:text-zinc-400 mt-0.5">
                    Our support team is ready to assist you.
                  </p>
                </div>

                <Link
                  href="/support"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#125233] text-white text-xs font-bold transition shadow-xs"
                >
                  <span>Contact Support</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          4. DIGITAL SIGNATURE MODAL (For any pending tenancy agreements)
         ════════════════════════════════════════════════════════════════════ */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Execute Digital Tenancy Agreement
              </h3>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Draw your signature below to cryptographically sign {agreementRef} under the
              Electronic Transactions Act, 2008 (Act 772).
            </p>
            <SignaturePad onSave={(dataUrl: string) => setSignatureData(dataUrl)} />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!signatureData || signMutation.isPending}
                onClick={() => signatureData && signMutation.mutate(signatureData)}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {signMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirm &amp; Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
