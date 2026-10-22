'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Scale, 
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
  LifeBuoy
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TermSection {
  id: string;
  number: string;
  title: string;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');
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
      toast.success('Terms link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Section Definitions
  const SECTIONS: TermSection[] = [
    {
      id: 'acceptance',
      number: '01',
      title: 'Acceptance of Platform Terms',
      badge: 'Act 772 Compliant',
      summary: 'Legally binding digital agreement executed upon platform access, listing, or reservation.',
      content: (
        <div className="space-y-4">
          <p>
            By accessing or utilizing the AkwaabaHomes platform (website, progressive web application, or authorized service portals), registering an account, publishing a property listing, or executing an accommodation reservation, you enter into a legally enforceable agreement with <strong>AkwaabaHomes Ghana PropTech Limited</strong>.
          </p>
          <p>
            These Platform Terms and Conditions, together with our <Link href="/privacy" className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-bold hover:underline">Privacy Policy</Link>, govern your access to our marketplace, escrow infrastructure, and digital tenancy instruments.
          </p>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0F5132] dark:text-emerald-400">
              <Scale className="w-4 h-4 shrink-0" />
              <span>Statutory Legal Basis (Republic of Ghana)</span>
            </div>
            <p className="leading-relaxed">
              These terms are executed pursuant to the <strong>Electronic Transactions Act, 2008 (Act 772)</strong> and the <strong>Rent Act, 1963 (Act 220)</strong>. Digital agreements and click-through affirmations on AkwaabaHomes hold full legal admissibility in Ghanaian courts.
            </p>
          </div>
          <p>
            If you do not accept these terms in their entirety, you must immediately terminate usage of our platform and refrain from initiating bookings or listing accommodations.
          </p>
        </div>
      )
    },
    {
      id: 'verification-roles',
      number: '02',
      title: 'User Roles & Ghana Card Verification',
      badge: 'Identity Protocol',
      summary: 'Three platform tiers with mandatory national identity authentication to eradicate rental fraud.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes operates three distinct verified user tiers, each with dedicated permissions and statutory compliance obligations:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2 font-bold text-xs">
                01
              </div>
              <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Tenants &amp; Students</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                Authorized to reserve rooms, execute digital lease agreements, and inspect properties with escrow protection.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2 font-bold text-xs">
                02
              </div>
              <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Landlords &amp; Hosts</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                Vetted property owners and accredited hostel administrators authorized to list units and receive verified rent payouts.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2 font-bold text-xs">
                03
              </div>
              <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Caretakers &amp; Staff</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                On-site gatehouse managers and operations personnel facilitating key transfers, check-ins, and emergency maintenance.
              </p>
            </div>
          </div>
          <p>
            <strong>Mandatory Ghana Card Identification:</strong> To eliminate impersonation scams and unlicensed middlemen, all landlords and resident tenants must complete Ghana Card verification via the National Identification Authority (NIA) verification gateway before listing properties or releasing rent funds.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            Submitting counterfeit credentials or misrepresenting title or tenancy authority constitutes a criminal offense under the Criminal Offences Act, 1960 (Act 29) and triggers immediate account termination with referral to the Ghana Police Service.
          </p>
        </div>
      )
    },
    {
      id: 'booking-escrow',
      number: '03',
      title: 'Hostel Bookings & Paystack Escrow Architecture',
      badge: 'Protected Escrow',
      summary: 'Advance rent is held in an audited trust account until the physical key handover protocol is confirmed.',
      content: (
        <div className="space-y-4">
          <p>
            To protect tenants and hosts from roadside commission extortion and ghost property listings, AkwaabaHomes enforces an automated, bank-grade escrow mechanism powered by Paystack:
          </p>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Advance Deposit to Trust Account:</strong> When a tenant reserves a hostel or private apartment, the booking payment (including security deposits and utilities) is transferred directly into an audited escrow trust account.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Inspection Lock Window:</strong> Funds are legally locked and cannot be withdrawn by the landlord until the tenant arrives on-site, inspects the designated room, and signs the physical check-in protocol.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Automated Disbursement:</strong> Once both the tenant and the on-site caretaker validate the Digital Move-In Pass, the escrow engine triggers automated settlement directly into the landlord&apos;s registered Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo) or Ghanaian bank account within 24 banking hours.</span>
            </li>
          </ul>
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Strict Prohibition of Offline Cash Transactions</span>
              <span>AkwaabaHomes will never ask you to pay cash directly to roadside agents, street brokers, or landlords prior to confirmed platform escrow. Payments made outside platform rails are strictly at user risk and void all escrow dispute guarantees.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'gender-locking',
      number: '04',
      title: 'Shared Rooms & Dynamic Gender Locking',
      badge: 'Student Housing Policy',
      summary: 'Automatic gender designation for multi-bed student rooms (2-in-1, 4-in-1) upon the first confirmed booking.',
      content: (
        <div className="space-y-4">
          <p>
            In shared student hostel accommodation (including 2-in-a-room, 3-in-a-room, and 4-in-a-room unit configurations), AkwaabaHomes employs an automated, tamper-proof <strong>Dynamic Gender Locking</strong> policy to strictly uphold institutional university guidelines (such as KNUST, UG Legon, UCC, and ATU housing codes).
          </p>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
            <h4 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <span>How Gender Locking Operates:</span>
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>When an empty room receives its first confirmed booking, the room is permanently assigned the biological gender of the first occupant (as verified on their Ghana Card).</li>
              <li>All subsequent available bed spaces within that room are locked exclusively to students of the matching gender for the entirety of that academic year or semester tenancy.</li>
              <li>Landlords, hostel administrators, and agents are technologically prevented from placing tenants of differing genders within the same shared room unit.</li>
            </ol>
          </div>
          <p>
            Any attempt by a hostel host or agent to arbitrarily override a room&apos;s gender lock without the written, notarized consent of existing occupants will result in listing suspension and immediate tenant compensation from the host&apos;s security reserve.
          </p>
        </div>
      )
    },
    {
      id: 'tenancy-agreements',
      number: '05',
      title: 'Binding Digital Tenancy Agreements',
      badge: 'Ghana Rent Act (Act 220)',
      summary: 'Legally counter-signed digital lease contracts enforceable under Ghanaian tenancy law.',
      content: (
        <div className="space-y-4">
          <p>
            Every confirmed residential rental executed through AkwaabaHomes automatically generates an individualized, tamper-evident <strong>Standard Digital Tenancy Agreement</strong>.
          </p>
          <p>
            This agreement delineates all essential covenants, including:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-900 dark:text-white block mb-0.5">&bull; Advance Rent Schedule:</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Duration, monthly rental rate, and lawful payment frequencies pursuant to Ghana Rent Act provisions.</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-900 dark:text-white block mb-0.5">&bull; Utility Meter Responsibilities:</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Clear division of ECG prepaid electricity, Ghana Water Company (GWCL), and backup generator fuel contributions.</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-900 dark:text-white block mb-0.5">&bull; Quiet Enjoyment &amp; Conduct:</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Permissible guest hours, noise thresholds, and property cleanliness standards.</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong className="text-zinc-900 dark:text-white block mb-0.5">&bull; Security Deposit Return:</strong>
              <span className="text-zinc-500 dark:text-zinc-400">Timelines for move-out damage inspections and refund disbursement within 14 banking days.</span>
            </div>
          </div>
          <p>
            Once electronically executed by both landlord and tenant, the digital agreement is timestamped and cryptographically archived. Either party may download and present this document to the <strong>Rent Control Department of Ghana</strong> or formal arbitral courts as admissible evidentiary proof.
          </p>
        </div>
      )
    },
    {
      id: 'property-listings',
      number: '06',
      title: 'Listing Standards & Anti-Fraud Policy',
      badge: 'Zero Tolerance',
      summary: 'Property listing standards, verified GPS mapping, and mandatory physical inspection standards.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes holds property hosts and landlords to exacting physical standards to maintain tenant safety and marketplace transparency:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Authentic Photography:</strong> All interior and exterior photos must represent current physical conditions. Digital renderings or photos of uncompleted structures must be explicitly demarcated as &ldquo;Under Construction&rdquo; with verifiable completion schedules.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>Accurate GPS Mapping:</strong> Property markers and campus proximity indicators must reflect precise GhanaPost GPS / Google Maps coordinates. Misleading location tags (e.g. advertising a remote site as &ldquo;Campus Gate adjacent&rdquo;) constitute platform fraud.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-2 shrink-0" />
              <span><strong>No Roadside Viewing Fees:</strong> Charging arbitrary inspection fees or transport levies to prospective tenants before viewing a listing is strictly prohibited.</span>
            </li>
          </ul>
          <p>
            Properties reported for misrepresentation are immediately placed into quarantine pending an on-site physical audit by AkwaabaHomes field verification officers.
          </p>
        </div>
      )
    },
    {
      id: 'disputes-refunds',
      number: '07',
      title: 'Move-In Disputes & 24-Hour Refund Guarantee',
      badge: '100% Protection',
      summary: '24-hour post-arrival dispute window to halt escrow payout and secure full rent reimbursement.',
      content: (
        <div className="space-y-4">
          <p>
            We recognize that move-in day is the most critical juncture of any tenancy. To safeguard tenants against bait-and-switch listings or uninhabitable conditions, AkwaabaHomes provides a <strong>24-Hour Move-In Inspection Window</strong>:
          </p>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-[#0F5132] dark:text-emerald-400 uppercase tracking-wider font-mono">
              <Clock className="w-4 h-4" />
              <span>How the Dispute Protocol Operates</span>
            </div>
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <p>
                <strong>1. Dispute Lodging:</strong> If a room is unhabitable, occupied by unauthorized third parties, lacking promised core amenities (running water, electricity), or materially deviates from the listing, the tenant can click &ldquo;Raise Inspection Dispute&rdquo; directly from their booking ledger within 24 hours of scheduled arrival.
              </p>
              <p>
                <strong>2. Immediate Escrow Freeze:</strong> Lodging a dispute instantly halts all automated settlement transfers to the landlord. Funds remain locked in the secure Paystack escrow trust.
              </p>
              <p>
                <strong>3. 48-Hour Resolution Window:</strong> Our mediation team reviews photographic and video evidence. The landlord is given 24 hours to offer an equivalent room or rectify the grievance.
              </p>
              <p>
                <strong>4. Full Refund Execution:</strong> If the grievance cannot be resolved, <strong>100% of the advance rent and security deposit</strong> is immediately reversed to the tenant&apos;s source account (MoMo or Card).
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Disputes raised after 24 hours or after keys have been freely accepted without notation of defects are governed by ordinary landlord-tenant mediation under standard Rent Act procedures.
          </p>
        </div>
      )
    },
    {
      id: 'liability-governance',
      number: '08',
      title: 'Limitation of Liability & Ghanaian Judicial Governance',
      badge: 'Jurisdiction',
      summary: 'Governed by the statutory laws of the Republic of Ghana with exclusive judicial venue in Ghanaian courts.',
      content: (
        <div className="space-y-4">
          <p>
            AkwaabaHomes operates as a secure PropTech marketplace and escrow intermediary. While we deploy rigorous identity checks, fraud detection algorithms, and physical audits, we are not the physical owner, insurer, or direct occupant of third-party rental properties.
          </p>
          <p>
            To the maximum extent permissible by Ghanaian law, AkwaabaHomes shall not be liable for indirect, incidental, punitive, or consequential damages resulting from personal conduct, unauthorized property entry, electrical utility surges, or municipal water outages beyond reasonable platform control.
          </p>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-1.5">
            <h4 className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <span>Governing Law &amp; Dispute Resolution Forum</span>
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              These Terms and Conditions are governed exclusively by the laws of the <strong>Republic of Ghana</strong>. Any legal action or formal proceeding arising under these terms that cannot be resolved through mutual platform mediation shall be submitted to the exclusive jurisdiction of the competent courts of Ghana situated in Accra or Kumasi.
            </p>
          </div>
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
            <span className="text-[#0F5132] dark:text-emerald-400 font-semibold">Terms &amp; Conditions</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>GOVERNED UNDER GHANA RENT ACT (ACT 220) &bull; ELECTRONIC TRANSACTIONS ACT (ACT 772)</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
                Platform Terms &amp; Conditions
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-normal">
                The legally binding agreement governing rental reservations, landlord listings, escrow protections, dynamic gender locking, and tenant move-in guarantees on AkwaabaHomes Ghana.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Last revised: October 2026</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>8 Core Statutory Clauses</span>
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
                title="Print legal instrument"
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
                <span>Legal Inquiries</span>
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* ── Executive Highlights (Plain English Summary) ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 pt-10 sm:pt-12">
        <div className="space-y-3 mb-6">
          <div className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#0F5132] dark:text-emerald-400">
            EXECUTIVE HIGHLIGHTS
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Key Tenancy Protections at a Glance
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Important practical highlights before reviewing the complete statutory legal clauses below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Escrow Trust Account</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Your advance rent is never paid straight to landlords or roadside agents. It is held securely until you inspect the property on move-in day.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <GraduationCap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Dynamic Gender Locking</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Shared university rooms auto-lock to the first occupant&apos;s verified gender. Landlords cannot force mixed-gender room allocations.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <Clock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">24-Hour Move-In Guarantee</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              If the physical unit materially deviates from the listing or fails health and safety standards, you receive a full 100% refund.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center shadow-2xs">
              <Scale className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Ghana Rent Act Admissibility</h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              All digital lease agreements countersigned on AkwaabaHomes are admissible before the Rent Control Department and formal courts.
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
                placeholder="Search clauses (e.g. escrow, gender, refund)..."
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
                  href="/privacy" 
                  className="flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] dark:hover:text-emerald-400 transition"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Privacy Policy (Act 843)</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <Link 
                  href="/support" 
                  className="flex items-center justify-between font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] dark:hover:text-emerald-400 transition"
                >
                  <span className="flex items-center gap-2">
                    <LifeBuoy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dispute Mediation Desk</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Institutional Sign-off badge */}
            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-[11px] text-zinc-400 space-y-1">
              <span className="font-bold text-zinc-600 dark:text-zinc-300 block">AkwaabaHomes Legal Desk</span>
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
                        SECTION {section.number}
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
                          navigator.clipboard.writeText(`${window.location.origin}/terms#${section.id}`);
                          toast.success(`Copied anchor link for Section ${section.number}`);
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
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Questions or Statutory Clarifications?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Our compliance team and certified Ghanaian legal counsel are available to assist.
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                If you have questions regarding our Escrow rules, university hostel quotas, or move-in dispute timelines, please contact our Legal &amp; Regulatory Compliance Desk at <a href="mailto:legal@akwaabahomes.com" className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline">legal@akwaabahomes.com</a> or open a ticket through our <Link href="/support" className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline">Dispute Desk</Link>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <span className="text-zinc-400">
                  Document Version 2.4 &bull; Effective Republic of Ghana
                </span>

                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                >
                  <span>Review Privacy Policy</span>
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
