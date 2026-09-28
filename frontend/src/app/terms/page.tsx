'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { id: 'acceptance', number: '01', title: 'Acceptance of Platform Terms' },
  { id: 'verification-roles', number: '02', title: 'User Roles & Ghana Card Verification' },
  { id: 'booking-escrow', number: '03', title: 'Hostel Bookings & Paystack Escrow' },
  { id: 'gender-locking', number: '04', title: 'Shared Rooms & Dynamic Gender Locking' },
  { id: 'tenancy-agreements', number: '05', title: 'Binding Digital Tenancy Agreements' },
  { id: 'property-listings', number: '06', title: 'Listing Standards & Anti-Fraud Policy' },
  { id: 'disputes-refunds', number: '07', title: 'Move-in Disputes & Refund Protocol' },
  { id: 'liability-governance', number: '08', title: 'Limitation of Liability & Ghanaian Law' },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');

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
              <span>Platform Terms &amp; Conditions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
              Legal agreement governing tenant bookings, landlord listings, escrow protections, and community standards on the AkwaabaHomes Ghana platform.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Last updated · September 2026</span>
              <span>•</span>
              <span>Governed under the Rent Act of Ghana (Act 220) &amp; Electronic Transactions Act</span>
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
                  href="/privacy" 
                  className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white py-1 transition-colors"
                >
                  <span>Privacy Policy</span>
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
            <section id="acceptance" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Acceptance of Platform Terms
                </h2>
              </div>
              <p>
                By accessing AkwaabaHomes, creating an account, publishing a property listing, or initiating an accommodation booking, you agree to be bound by these Terms and Conditions and our Privacy Policy.
              </p>
              <p>
                If you do not agree to these terms, you must refrain from using the platform. These terms constitute a legally binding agreement under the Electronic Transactions Act, 2008 (Act 772) of the Republic of Ghana.
              </p>
            </section>

            {/* Section 02 */}
            <section id="verification-roles" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  User Roles &amp; Ghana Card Verification
                </h2>
              </div>
              <p>
                AkwaabaHomes operates three distinct user access tiers: <strong className="text-zinc-900 dark:text-white">Tenants/Students</strong>, <strong className="text-zinc-900 dark:text-white">Landlords/Hosts</strong>, and <strong className="text-zinc-900 dark:text-white">Caretakers/Staff</strong>.
              </p>
              <p>
                To maintain a safe environment, all landlords and student tenants must complete profile verification. Providing false identification documents or misrepresenting property ownership is strictly prohibited and subject to immediate account termination and referral to the Ghana Police Service.
              </p>
            </section>

            {/* Section 03 */}
            <section id="booking-escrow" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Hostel Bookings &amp; Paystack Escrow
                </h2>
              </div>
              <p>
                To eliminate roadside viewing fee scams and rental fraud, AkwaabaHomes mandates an audited Escrow Payment model:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
                <li>Upon booking, advance rent is deposited into an audited trust escrow account managed via licensed payment gateways.</li>
                <li>Funds are strictly held until the tenant conducts the on-site move-in inspection and signs the key handover protocol.</li>
                <li>Once the caretaker and tenant confirm the handover pass, funds are settled directly into the landlord&apos;s registered Mobile Money or bank account.</li>
              </ul>
            </section>

            {/* Section 04 */}
            <section id="gender-locking" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Shared Rooms &amp; Dynamic Gender Locking
                </h2>
              </div>
              <p>
                In shared student accommodation (e.g. 2-in-a-room or 4-in-a-room hostel units), rooms automatically lock to the gender of the first confirmed occupant to uphold university housing policies.
              </p>
              <p>
                Landlords may not override an active gender lock unless all remaining beds are vacant and unbooked.
              </p>
            </section>

            {/* Section 05 */}
            <section id="tenancy-agreements" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Binding Digital Tenancy Agreements
                </h2>
              </div>
              <p>
                Every confirmed rental generates an electronic lease agreement outlining the rental rate, utility splits, house rules, and security deposit terms.
              </p>
              <p>
                Both parties execute the document via electronic signature. Once countersigned, the agreement holds legal evidentiary status under the Rent Act, 1963 (Act 220) and Electronic Transactions Act, 2008 (Act 772).
              </p>
            </section>

            {/* Section 06 */}
            <section id="property-listings" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Listing Standards &amp; Anti-Fraud Policy
                </h2>
              </div>
              <p>
                Landlords are responsible for ensuring that all published photos, GPS coordinates, amenities, and room dimensions accurately reflect physical conditions.
              </p>
              <p>
                Listing unconstructed or unavailable units, charging unauthorized offline inspection fees, or refusing tenant check-in after escrow confirmation will trigger immediate blacklisting and forfeiture of escrow processing fees.
              </p>
            </section>

            {/* Section 07 */}
            <section id="disputes-refunds" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Move-in Disputes &amp; Refund Protocol
                </h2>
              </div>
              <p>
                If a property severely deviates from its listing description or fails health and safety standards during move-in, the tenant may raise an inspection dispute within 24 hours of arrival.
              </p>
              <p>
                When a dispute is active, the escrow release is frozen. Our dispute mediation team conducts an evidence review within 48 hours. If the landlord fails to rectify the breach, a 100% refund of advance rent is returned to the tenant.
              </p>
            </section>

            {/* Section 08 */}
            <section id="liability-governance" className="scroll-mt-28 space-y-4">
              <div className="flex items-baseline gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <span className="text-xs font-mono font-bold text-[#0F5132] dark:text-emerald-400">08</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  Limitation of Liability &amp; Ghanaian Law
                </h2>
              </div>
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising that cannot be resolved through our mutual mediation process shall be subject to the exclusive jurisdiction of the courts of Ghana.
              </p>
            </section>

            {/* Bottom Document Pagination Navigation */}
            <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <Link 
                href="/privacy" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </Link>
              <Link 
                href="/faq" 
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
              >
                <span>Help Center &amp; FAQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </main>

        </div>
      </div>

    </div>
  );
}
