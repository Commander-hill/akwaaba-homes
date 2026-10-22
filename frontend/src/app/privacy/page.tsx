'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  GraduationCap, 
  Search, 
  Printer, 
  Copy, 
  Check,
  ArrowRight, 
  ChevronRight, 
  HelpCircle,
  ExternalLink,
  LifeBuoy,
  KeyRound,
  EyeOff,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PrivacySection {
  id: string;
  number: string;
  title: string;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('data-collection');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Track scroll position & calculate reading progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      const scrollPosition = window.scrollY + 220;
      const sectionElements = document.querySelectorAll('section[id]');
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i] as HTMLElement;
        if (el.offsetTop <= scrollPosition) {
          setActiveSection(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const copyPageLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Privacy policy link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Section Definitions
  const SECTIONS: PrivacySection[] = [
    {
      id: 'data-collection',
      number: '01',
      title: 'Data Collection & Ghana Card Verification',
      badge: 'NIA Verified',
      summary: 'Data collected strictly for tenancy administration, student housing quotas, and identity authentication.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes operates as a registered Ghanaian PropTech marketplace connecting students, residential tenants, verified property hosts, and gatehouse caretakers. To maintain community safety and eliminate rental scams, we collect personal identity data strictly necessary for tenancy execution and identity verification.
          </p>
          <p>
            When you register, verify your identity, or initiate an accommodation reservation, we collect:
          </p>
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">&bull; Personal Credentials &amp; Contact Records:</strong>
              <span className="text-zinc-600 dark:text-zinc-400">Full legal name, gender, date of birth, primary phone number (e.g. Ghanaian mobile money phone number), and verified email address.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">&bull; Ghana Card Identification Data:</strong>
              <span className="text-zinc-600 dark:text-zinc-400">National Identification Number (GHA-XXXXXXXXX-X) and cryptographic identity verification tokens solely for cross-validation against National Identification Authority (NIA) verification gateways.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">&bull; Tertiary Student Enrollment Information:</strong>
              <span className="text-zinc-600 dark:text-zinc-400">For university tenants: campus affiliation (KNUST, UG Legon, UCC, ATU, etc.), student ID / index number, year of study, degree programme, and emergency guardian contact details.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">&bull; Property Ownership &amp; Business Authorizations:</strong>
              <span className="text-zinc-600 dark:text-zinc-400">For property owners: site plans, land title certificates, indentures, and municipal assembly business operating permits.</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            We never collect sensitive biometric files or unverified copies of national ID cards without explicit cryptographic encryption and user authorization.
          </p>
        </div>
      )
    },
    {
      id: 'data-use',
      number: '02',
      title: 'Lawful Purposes of Data Processing',
      badge: 'Legitimate Interest',
      summary: 'Legitimate processing purposes including electronic lease generation, escrow security, and gatehouse access.',
      content: (
        <div className="space-y-4">
          <p>
            Pursuant to Section 18 of the Data Protection Act, 2012 (Act 843), personal data must be processed for specific, explicitly defined, and lawful purposes. AkwaabaHomes processes your information exclusively for the following operational objectives:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Execution of Digital Tenancy Agreements:</strong> Generating legally binding lease contracts containing authenticated tenant and landlord names, advance rent figures, and utility schedules pursuant to the Rent Act of Ghana.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Gatehouse &amp; Check-In Authentication:</strong> Generating the secure QR Move-In Pass validated by on-site caretakers during room key transfers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Escrow Payout Auditing:</strong> Recording transactional timestamps to authorize release of advance rent to landlords once move-in protocols are confirmed.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Dynamic Gender-Lock Enforcement:</strong> Automating gender locking for shared multi-bed student accommodation units to protect student safety and institutional compliance.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Dispute Mediation &amp; Investigation:</strong> Reviewing move-in defect claims, escrow refunds, and emergency maintenance requests.</span>
            </li>
          </ul>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            AkwaabaHomes does not engage in behavioral profiling, automated credit scoring, or secondary selling of user profiles to commercial third parties.
          </p>
        </div>
      )
    },
    {
      id: 'security-storage',
      number: '03',
      title: 'Storage & Encryption Standards',
      badge: 'AES-256 & TLS 1.3',
      summary: 'High-grade cryptographic protection for all identity scans, lease files, and database records.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes utilizes modern defense-in-depth security standards to protect personal data against accidental loss, unauthorized access, destruction, or disclosure:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0F5132] dark:text-emerald-400">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Encryption in Transit</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                All communications between your device and our servers are encrypted using modern Transport Layer Security (TLS 1.3) with perfect forward secrecy.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0F5132] dark:text-emerald-400">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Encryption at Rest</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                All identity documents, land ownership deeds, and payment ledgers are stored with AES-256 cryptographic keys managed via isolated key vaults.
              </p>
            </div>
          </div>
          <p>
            <strong>Role-Based Access Controls (RBAC):</strong> Employee access to user verification files is strictly compartmentalized based on least-privilege principles. All access sessions are logged in tamper-evident security audit trails monitored 24/7.
          </p>
        </div>
      )
    },
    {
      id: 'payment-escrow',
      number: '04',
      title: 'Payment Processing & Escrow Privacy',
      badge: 'PCI-DSS Compliant',
      summary: 'Card and Mobile Money credentials are handled entirely by Bank of Ghana-regulated payment gateways.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes processes advance rent and security deposits through certified, Bank of Ghana-regulated payment gateway partners (including Paystack and national Mobile Money switches):
          </p>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0F5132] dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero Financial Credential Retention</span>
            </div>
            <p className="leading-relaxed">
              AkwaabaHomes <strong>never stores, views, or processes</strong> your full debit/credit card number, CVV code, or personal Mobile Money PIN. All payment inputs are tokenized directly within the licensed gateway&apos;s PCI-DSS Level 1 certified environment.
            </p>
          </div>
          <p>
            Our internal database retains only the anonymized transaction reference token, transaction status (Escrow Pending, Released, Refunded), currency amount, and payment timestamp for statutory bookkeeping and dispute resolution.
          </p>
        </div>
      )
    },
    {
      id: 'data-sharing',
      number: '05',
      title: 'Third-Party Disclosure & Zero-Sale Guarantee',
      badge: 'No Data Brokers',
      summary: 'We never sell or rent your personal records. Data is shared exclusively with verified tenancy counterparties.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes maintains an unwavering policy: <strong>We do not sell, rent, monetize, or lease your personal data</strong> to real estate lead brokers, marketing agencies, or advertising networks.
          </p>
          <p>
            We disclose limited personal data strictly under the following narrow circumstances:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Your Confirmed Tenancy Counterparty:</strong> Once a reservation deposit is secured in escrow, your full name, verified phone number, and emergency contact details are shared with the property host (and vice versa) to facilitate move-in logistics.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>National Law Enforcement &amp; Court Orders:</strong> Where strictly required under formal court subpoena, Ghanaian criminal investigation, or statutory mandate by the Ghana Police Service.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Licensed Escrow Banking Gateways:</strong> Transmitting necessary transaction identifiers to Paystack and banking partners to execute authorized rent disbursements and refund reversals.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'user-rights',
      number: '06',
      title: 'Your Statutory Rights Under Act 843',
      badge: 'Data Protection Act 2012',
      summary: 'Full statutory protections under Ghanaian privacy law including access, rectification, and erasure.',
      content: (
        <div className="space-y-4">
          <p>
            Under Sections 35 through 43 of the Data Protection Act, 2012 (Act 843), you hold legally protected data subject rights regarding your personal records:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">1. Right of Access (Section 35)</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Request a complete copy of all personal records, booking histories, and agreements held in your account.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">2. Right to Rectification (Section 39)</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Correct inaccurate, incomplete, or outdated personal information via your profile workspace.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">3. Right to Prevent Processing (Section 36)</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Object to non-statutory data processing or opt out of non-essential SMS and email platform announcements.</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-950 dark:text-white block mb-0.5">4. Right to Erasure / Account Deletion</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Request permanent deletion of your profile and cryptographic identification records upon tenancy completion.</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            To exercise any of these rights, contact our Data Protection Officer directly or submit a request via our <Link href="/support" className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-bold hover:underline">Support Portal</Link>. Requests are processed within 14 calendar days.
          </p>
        </div>
      )
    },
    {
      id: 'retention-deletion',
      number: '07',
      title: 'Data Retention & Account Deletion Schedules',
      badge: 'Statutory Retention',
      summary: 'Data is expunged upon account termination, retaining only statutory financial records required by Ghana Revenue Authority.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes retains personal data only for as long as is necessary to fulfill the purposes for which it was collected or to satisfy statutory obligations under Ghanaian law:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Active Account Lifecycle:</strong> Your profile, academic affiliation, and listings remain active and accessible until you request account termination.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Identity Scan Erasure:</strong> Upon account closure, all stored national ID scans and verification proofs are permanently wiped from active servers within 30 days.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Financial &amp; Tenancy Records:</strong> Executed tenancy agreements and financial transaction ledgers are retained for a statutory period of six (6) years to comply with Ghana Revenue Authority (GRA) tax audit rules and the Rent Control Act.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'contact-dpo',
      number: '08',
      title: 'Data Protection Officer & Regulatory Inquiries',
      badge: 'DPC Ghana Registered',
      summary: 'Direct contact coordinates for our certified Data Protection Officer and regulatory escalation channels.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes Ghana PropTech Limited has appointed a certified <strong>Data Protection Officer (DPO)</strong> responsible for overseeing compliance with the Data Protection Commission (DPC) of Ghana:
          </p>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2 text-xs">
            <div className="font-bold text-sm text-zinc-950 dark:text-white">
              Office of the Data Protection Officer &bull; AkwaabaHomes Ghana
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              <strong>Official Inquiries:</strong> <a href="mailto:privacy@akwaabahomes.com" className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-bold hover:underline">privacy@akwaabahomes.com</a>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              <strong>Legal Desk:</strong> <a href="mailto:legal@akwaabahomes.com" className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-bold hover:underline">legal@akwaabahomes.com</a>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              <strong>Physical Headquarters:</strong> Accra Digital Centre, Ring Road West, Accra, Republic of Ghana
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            If you are not satisfied with our resolution of any privacy concern, you retain the statutory right under Act 843 to lodge a formal complaint with the <strong>Data Protection Commission of Ghana</strong> (East Legon, Accra).
          </p>
        </div>
      )
    }
  ];

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.summary.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Scroll Progress Bar ── */}
      <div className="fixed top-16 inset-x-0 h-1 bg-zinc-200/50 dark:bg-zinc-800/50 z-30">
        <div 
          className="h-full bg-[#0F5132] dark:bg-emerald-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ── Hero Document Banner ── */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-[#111419]/70 backdrop-blur-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 relative z-10">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-950 dark:hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-zinc-600 dark:text-zinc-300">Legal</span>
            <span>/</span>
            <span className="text-[#0F5132] dark:text-emerald-400 font-semibold">Privacy Policy</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>GOVERNED UNDER GHANA DATA PROTECTION ACT, 2012 (ACT 843)</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
                Data Privacy &amp; Protection Policy
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-normal">
                How AkwaabaHomes Ghana collects, processes, and cryptographically safeguards your national identity records, student enrollment data, and tenancy files across our marketplace.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Last revised: October 2026</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>8 Statutory Compliance Articles</span>
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Valid across Accra, Kumasi, Cape Coast &amp; all Campus Portals
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2.5 self-start lg:self-end shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="h-10 px-3.5 inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer"
                title="Print privacy policy"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={copyPageLink}
                className="h-10 px-3.5 inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer"
                title="Copy link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
              </button>

              <Link
                href="/support"
                className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Privacy Inquiries</span>
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* ── Executive Highlights (Plain English Summary) ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 pt-10 sm:pt-12">
        <div className="space-y-3 mb-6">
          <div className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#0F5132] dark:text-emerald-400">
            PRIVACY GUARANTEES AT A GLANCE
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Our Commitment to Your Privacy
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Essential highlights of how we protect your personal and financial data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <EyeOff className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Zero Third-Party Selling</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              We never sell or rent your personal records, phone numbers, or student status to advertising networks or real estate lead brokers.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <UserCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Ghana Card Verified</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              National identity data is cross-verified directly with NIA protocols and encrypted at rest using AES-256 standards.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <Lock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Bank-Grade Payments</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              All transactions run via licensed Bank of Ghana gateways. We never view or store debit card CVVs or Mobile Money PINs.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Act 843 Subject Rights</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Full legal entitlement to access, rectify, or request erasure of your personal data under the Data Protection Act of Ghana.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Reading Area ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* ──── Left Sticky Navigation (35% Desktop) ──── */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 self-start space-y-6">
            
            {/* Search Filter Box */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search privacy topics (e.g. Ghana Card, Paystack, deletion)..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl placeholder:text-zinc-400 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] transition"
              />
            </div>

            {/* Table of Contents List */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold px-3">
                TABLE OF CONTENTS
              </div>

              <nav className="space-y-1">
                {filteredSections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'text-[#0F5132] dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#0F5132] dark:text-emerald-400' : 'text-zinc-400'}`}>
                          {section.number}
                        </span>
                        <span className="truncate">{section.title}</span>
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}

                {filteredSections.length === 0 && (
                  <div className="p-4 text-xs text-zinc-400 text-center">
                    No matching clauses found.
                  </div>
                )}
              </nav>
            </div>

            {/* Quick Related Legal Instruments */}
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">
                COMPANION POLICIES
              </span>

              <div className="space-y-2 text-xs">
                <Link 
                  href="/terms" 
                  className="flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] dark:hover:text-emerald-400 transition"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Terms &amp; Conditions (Act 220)</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <Link 
                  href="/support" 
                  className="flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] dark:hover:text-emerald-400 transition"
                >
                  <span className="flex items-center gap-2">
                    <LifeBuoy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Data Subject Request Desk</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Institutional Sign-off badge */}
            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-[11px] text-zinc-400 space-y-1">
              <span className="font-bold text-zinc-600 dark:text-zinc-300 block">Data Protection Office</span>
              <p>Registration No. CS128942024 &bull; Accra &amp; Kumasi, Republic of Ghana</p>
            </div>

          </aside>

          {/* ──── Right Reading Column (65% Desktop) ──── */}
          <main className="lg:col-span-8 space-y-14 text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            
            {SECTIONS.map((section) => (
              <section 
                key={section.id} 
                id={section.id} 
                className="scroll-mt-28 space-y-4 pt-2"
              >
                {/* Section Header */}
                <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                        ARTICLE {section.number}
                      </span>
                      {section.badge && (
                        <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-500">
                          &bull; {section.badge}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/privacy#${section.id}`);
                          toast.success(`Copied anchor link for Article ${section.number}`);
                        }
                      }}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                      title="Copy section link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    {section.title}
                  </h2>
                </div>

                {/* Section Content */}
                <div className="pt-1">
                  {section.content}
                </div>
              </section>
            ))}

            {/* ── Document Governance Closure ── */}
            <div className="mt-14 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111419] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Need Data Protection Assistance?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Our Data Protection Officer and compliance team are available to help.
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                To submit a Subject Access Request (SAR), request account erasure, or report an identity security concern, email our Data Protection Office at <a href="mailto:privacy@akwaabahomes.com" className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline">privacy@akwaabahomes.com</a>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <span className="text-zinc-400">
                  Data Protection Act, 2012 (Act 843) &bull; Republic of Ghana
                </span>

                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                >
                  <span>Review Terms &amp; Conditions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </main>

        </div>
      </div>

    </div>
  );
}
