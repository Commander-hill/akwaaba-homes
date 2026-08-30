import { ShieldCheck, Lock, Eye, Database, Server, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Privacy Policy</h1>
          <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
            How Akwaaba Homes collects, uses, and safeguards your identity and personal data under Ghana's Data Protection Act, 2012 (Act 843).
          </p>
        </div>

        <div className="space-y-8 glass-card p-8 rounded-3xl border border-[var(--border)]">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <ShieldCheck className="text-[var(--primary)]" /> 1. Data Collection & Ghana Card Verification
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              We collect your name, email address, phone number, university details, and Ghana Card verification records solely to verify your identity and protect accommodation seekers and property owners from fraud.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Lock className="text-[var(--primary)]" /> 2. End-to-End Encryption & Storage
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              All credentials, sensitive documents, and tenancy agreements are encrypted in transit via TLS 1.3 and at rest using cryptographic AES-256 standards. Identification files are stored in private, restricted-access storage vaults accessible only by verified compliance officers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Eye className="text-[var(--primary)]" /> 3. Data Sharing & Third-Party Protections
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              We never sell or rent your personal data to marketers or external data brokers. Payment transactions are processed directly through licensed banking partners (Paystack / Mobile Money) without storing full debit card or mobile wallet PINs on our servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Database className="text-amber-500" /> 4. Your Rights & Data Retention
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              You retain the right to request access to your personal records, rectify outdated profile information, or request account closure and data deletion in accordance with standard statutory tenancy and financial reporting guidelines.
            </p>
          </section>
        </div>

        <div className="text-center">
          <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-xl transition-colors">
            Return to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
