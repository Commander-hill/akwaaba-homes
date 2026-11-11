'use client';
import '@/app/secondary.css';

import Link from 'next/link';
import clsx from 'clsx';

export default function NavbarMobileDrawer({
  navLinks,
  pathname,
  isAuthenticated,
  dashboardHref,
  onClose,
}: {
  navLinks: Array<{ name: string; href: string }>;
  pathname: string;
  isAuthenticated: boolean;
  dashboardHref: string;
  onClose: () => void;
}) {
  return (
    <div className="md:hidden fixed inset-0 top-16 z-50 flex flex-col">
      <div className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#141816] border-b border-zinc-200 dark:border-zinc-800 px-5 pt-4 pb-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          {navLinks.map((link) => (
            <Link
              prefetch={false}
              key={link.name}
              href={link.href}
              onClick={onClose}
              className={clsx(
                'block px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                pathname === link.href
                  ? 'bg-[#EDF6F0] text-[#15803D] dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'text-[#242925] dark:text-white hover:bg-zinc-50 dark:hover:bg-[#1B211E]'
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
          {isAuthenticated ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                prefetch={false}
                href={dashboardHref}
                onClick={onClose}
                className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg"
              >
                My Account
              </Link>
              <Link
                prefetch={false}
                href="/bookings"
                onClick={onClose}
                className="h-10 flex items-center justify-center text-xs font-semibold text-[#242925] dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-lg"
              >
                My Bookings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                prefetch={false}
                href="/login"
                onClick={onClose}
                className="h-10 flex items-center justify-center text-xs font-semibold text-[#242925] dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-lg"
              >
                Sign in
              </Link>
              <Link
                prefetch={false}
                href="/register"
                onClick={onClose}
                className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
