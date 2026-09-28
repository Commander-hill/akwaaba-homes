'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, ShieldCheck, FileText, HelpCircle } from 'lucide-react';

const SECTIONS = [
  { id: 'data-collection', number: '01', title: 'Data Collection & Ghana Card Verification' },
  { id: 'data-use', number: '02', title: 'How We Use Your Information' },
  { id: 'security-storage', number: '03', title: 'Storage & Encryption Standards' },
  { id: 'payment-escrow', number: '04', title: 'Payment Processing & Escrow Privacy' },
  { id: 'data-sharing', number: '05', title: 'Third-Party Disclosure & Integrity' },
  { id: 'user-rights', number: '06', title: 'Your Rights Under Act 843' },
  { id: 'retention-deletion', number: '07', title: 'Data Retention & Account Deletion' },
  { id: 'contact-dpo', number: '08', title: 'Data Protection Officer Contact' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('data-collection');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Document Header ── */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-[#111419]/50 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#0F5132] dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400" />
              <span>Legal &amp; Regulatory Compliance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
              How AkwaabaHomes collects, processes, and protects your personal data in accordance with Ghana&apos;s Data Protection Act, 2012 (Act 843) and statutory tenancy guidelines.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Last updated · September 2026</span>
              <span>•</span>
              <span>Effective across Accra, Kumasi, Cape Coast &amp; all campus portals</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Editorial Layout ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* ──── Left Sticky Table of Contents (35%) ──── */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 self-start space-y-6">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold px-3">
                Contents
              </div>
              <nav className="space-y-0.5">
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'text-[#0F5132] dark:text-emerald-400 font-semibold bg-emerald-50/80 dark:bg-emerald-950/30'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className={`text-[10px] font-mono ${isActive ? 'text-[#0F5132] dark:text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                          {section.number}
                        </span>
                        <span className="truncate">{section.title}</span>
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Related Legal Links */}
            <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 px-3 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                Related Instruments
              </span>
              <div className="space-y-1 text-xs">
                <Link 
                  href="/terms" 
                  className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white py-1 transition-colors"
                >
                  <span>Terms &amp; Conditions</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <Link 
                  href="/faq" 
                  className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white py-1 transition-colors"
                >
                  <span>Help Center &amp; FAQ</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </aside>

          {/* ──── Right Reading Column (65%) ──── */}
          <main className="lg:col-span-8 max-w-2xl space-y-12 text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            
            {/* Section 01 */}
            <section id="data-collection" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Data Collection &amp; Ghana Card Verification
                </h2>
              </div>
              <p>
                AkwaabaHomes operates as a registered Ghana PropTech marketplace connecting students, residential tenants, landlords, and property caretakers. To maintain safety and prevent fraudulent listings, we collect personal identity data strictly necessary for tenancy governance.
              </p>
              <p>
                When you create an account or verify your profile, we collect:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
                <li><strong className="text-zinc-900 dark:text-zinc-200">Account Credentials:</strong> Full name, university or institutional affiliation, verified phone number, and email address.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Ghana Card Identification:</strong> National identification number and document scans solely for identity cross-verification against National Identification Authority (NIA) protocols.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Ownership Documentation:</strong> Site plans, indentures, and municipal assembly business permits for landlords registering rental premises.</li>
              </ul>
            </section>

            {/* Section 02 */}
            <section id="data-use" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  How We Use Your Information
                </h2>
              </div>
              <p>
                Your personal records are processed exclusively for tenancy administration and identity verification. We never utilize your information for third-party commercial profiling or unsolicited marketing.
              </p>
              <p>
                Specific use cases include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
                <li>Generating legally compliant digital tenancy agreements countersigned by both parties.</li>
                <li>Facilitating gatehouse key handovers with hostel caretakers.</li>
                <li>Pairing compatible student roommates based on opted-in study habits and schedules.</li>
                <li>Investigating maintenance disputes or deposit escrow refunds.</li>
              </ul>
            </section>

            {/* Section 03 */}
            <section id="security-storage" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Storage &amp; Encryption Standards
                </h2>
              </div>
              <p>
                All data transmission between your browser and our platform is encrypted via TLS 1.3. Identification files, indenture documents, and tenancy ledgers are encrypted at rest using AES-256 standards.
              </p>
              <p>
                Access to verification records is strictly restricted to designated compliance moderators under least-privilege role-based access controls (RBAC). All administrative access is logged in tamper-evident audit trails.
              </p>
            </section>

            {/* Section 04 */}
            <section id="payment-escrow" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Payment Processing &amp; Escrow Privacy
                </h2>
              </div>
              <p>
                Rent disbursements and advance payments are processed directly through licensed banking partners and Bank of Ghana-regulated mobile money aggregators (including Paystack and Mobile Money rails).
              </p>
              <p>
                AkwaabaHomes does not store, view, or process debit card CVVs or mobile money PINs. Payment tokens and escrow release confirmations are recorded purely for dispute auditing and transaction receipts.
              </p>
            </section>

            {/* Section 05 */}
            <section id="data-sharing" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Third-Party Disclosure &amp; Integrity
                </h2>
              </div>
              <p>
                We do not sell, rent, or lease personal information to brokers, advertisers, or lead generators. We share data only with:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
                <li><strong className="text-zinc-900 dark:text-zinc-200">The counterparty to your tenancy agreement:</strong> Basic profile verification and emergency contact details shared only after a confirmed booking.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Law enforcement or court order:</strong> Where strictly required under Ghanaian law or statutory dispute investigations.</li>
              </ul>
            </section>

            {/* Section 06 */}
            <section id="user-rights" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Your Rights Under Act 843
                </h2>
              </div>
              <p>
                Under Section 35 through 43 of the Data Protection Act, 2012 (Act 843), you hold the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
                <li>Access all personal data held in your profile.</li>
                <li>Rectify inaccurate, outdated, or incomplete records.</li>
                <li>Withdraw consent for optional communications or roommate matching algorithms.</li>
                <li>Lodge an inquiry or grievance with our Data Protection Officer or the Data Protection Commission of Ghana.</li>
              </ul>
            </section>

            {/* Section 07 */}
            <section id="retention-deletion" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Data Retention &amp; Account Deletion
                </h2>
              </div>
              <p>
                Profile information is retained for the active duration of your account. Upon requesting account closure, personal identification scans are securely expunged within 30 days, except where tenancy receipts or financial audit logs are required by Ghana Revenue Authority regulations to be retained for statutory periods.
              </p>
            </section>

            {/* Section 08 */}
            <section id="contact-dpo" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">08</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Data Protection Officer Contact
                </h2>
              </div>
              <p>
                For questions regarding data processing, privacy concerns, or data erasure requests, please contact our Compliance Desk:
              </p>
              <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-white">AkwaabaHomes Data Protection &amp; Legal Desk</div>
                <div className="text-zinc-600 dark:text-zinc-400">Email: compliance@akwaabahomes.com.gh</div>
                <div className="text-zinc-600 dark:text-zinc-400">Accra Digital Centre, Ring Road West, Accra, Ghana</div>
              </div>
            </section>

            {/* Bottom Document Pagination Navigation */}
            <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <Link 
                href="/terms" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
              >
                <span>Terms &amp; Conditions &rarr;</span>
              </Link>
              <Link 
                href="/faq" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <span>Help Center &rarr;</span>
              </Link>
            </div>

          </main>

        </div>
      </div>

    </div>
  );
}
