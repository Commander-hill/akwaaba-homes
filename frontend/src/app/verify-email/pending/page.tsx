import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';

export default function PendingVerificationPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 -translate-y-12 -translate-x-1/3 w-[600px] h-[600px] bg-[var(--primary)] opacity-10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 glass-card p-10 rounded-3xl animate-in relative z-10 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-[var(--primary)]" />
          </div>
        </div>
        
        <div>
          <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Check your email
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)]">
            We've sent a secure verification link to your email address. Please click the link to activate your account.
          </p>
        </div>

        <div className="pt-6 border-t border-[var(--border)]">
          <Link href="/login" className="flex justify-center items-center gap-2 font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
