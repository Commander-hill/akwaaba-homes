import { FileText, Shield, UserCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Terms & Conditions</h1>
          <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Please read these ethical guidelines, terms, and conditions carefully before using the Akwaaba Homes platform.
          </p>
        </div>

        <div className="space-y-8 glass-card p-8 rounded-3xl">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Shield className="text-[var(--primary)]" /> 1. Privacy & Data Protection
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              We strictly enforce the protection of your personal information. We do not collect unnecessary data, and all sensitive records (such as Ghana Card verification images) are encrypted and stored securely. Your data will never be sold or disclosed to unauthorized third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <UserCheck className="text-[var(--primary)]" /> 2. Role-Based Permissions
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Akwaaba Homes implements strict Role-Based Access Controls. You may only access resources explicitly granted to your account type (Tenant, Landlord, or Administrator). Attempting to bypass these controls is a violation of our ethical guidelines and will result in immediate account suspension.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="text-[var(--primary)]" /> 3. Community Moderation
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              To maintain a safe and respectful environment, all property listings and reviews are subject to strict administrative moderation. Administrators reserve the right to approve, reject, or delete content that is deemed inappropriate, fraudulent, or unsafe for our student community.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <AlertTriangle className="text-amber-500" /> 4. Credentials & Security
            </h2>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              You are responsible for protecting your user credentials. The platform will never ask for your password via email or phone. By agreeing to these terms, you acknowledge that any fraudulent activity originating from your account may lead to permanent suspension and reporting to the appropriate authorities.
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
