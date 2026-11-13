'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Building2,
  CalendarCheck,
  Wallet,
  CreditCard,
  Users,
  Bell,
  User,
  ShieldCheck,
  LayoutDashboard,
  Wrench,
  Megaphone,
  Receipt,
  FileText,
  MessageSquare,
  Heart,
  ArrowRight,
  Compass,
} from 'lucide-react';
import clsx from 'clsx';

interface PortalQuickItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  url: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const LANDLORD_ITEMS: PortalQuickItem[] = [
  {
    id: 'll-dashboard',
    category: 'PORTFOLIO',
    title: 'Landlord Dashboard',
    subtitle: 'Overview, revenue metrics & active listings',
    url: '/dashboard/landlord',
    keywords: ['dashboard', 'overview', 'home', 'stats'],
    icon: LayoutDashboard,
  },
  {
    id: 'll-properties',
    category: 'PORTFOLIO',
    title: 'Properties & Units',
    subtitle: 'Manage listings, pricing & unit availability',
    url: '/dashboard/landlord/properties',
    keywords: ['properties', 'units', 'listings', 'apartments', 'rooms'],
    icon: Building2,
  },
  {
    id: 'll-new-property',
    category: 'PORTFOLIO',
    title: 'Add New Property',
    subtitle: 'Publish a new apartment, hostel, or house',
    url: '/dashboard/landlord/new',
    keywords: ['add', 'new', 'create', 'publish', 'property'],
    icon: Building2,
  },
  {
    id: 'll-bookings',
    category: 'PORTFOLIO',
    title: 'Bookings & Applications',
    subtitle: 'Review, confirm, or manage tenant bookings',
    url: '/dashboard/landlord/bookings',
    keywords: ['bookings', 'applications', 'reservations', 'requests'],
    icon: CalendarCheck,
  },
  {
    id: 'll-tenants',
    category: 'PORTFOLIO',
    title: 'Tenants & Residents',
    subtitle: 'Active leases, resident directory & check-ins',
    url: '/dashboard/landlord/tenants',
    keywords: ['tenants', 'residents', 'leases', 'occupants'],
    icon: Users,
  },
  {
    id: 'll-operations',
    category: 'FINANCES',
    title: 'Revenue & Operations',
    subtitle: 'Maintenance tickets, operations & rent logs',
    url: '/dashboard/landlord/operations',
    keywords: ['operations', 'revenue', 'tickets', 'maintenance'],
    icon: CreditCard,
  },
  {
    id: 'll-withdraw',
    category: 'FINANCES',
    title: 'Earnings & Payouts',
    subtitle: 'Withdraw funds & inspect settlement history',
    url: '/dashboard/landlord/withdraw',
    keywords: ['payouts', 'withdraw', 'earnings', 'bank', 'momo'],
    icon: Wallet,
  },
  {
    id: 'll-expenses',
    category: 'FINANCES',
    title: 'Property Expenses',
    subtitle: 'Log repairs, utility bills & operating costs',
    url: '/dashboard/landlord/expenses/new',
    keywords: ['expenses', 'costs', 'bills', 'repairs'],
    icon: Receipt,
  },
  {
    id: 'll-subscription',
    category: 'FINANCES',
    title: 'Platform Subscription',
    subtitle: 'Manage landlord plan & billing cycle',
    url: '/dashboard/landlord/subscription',
    keywords: ['subscription', 'plan', 'pro', 'billing'],
    icon: CreditCard,
  },
  {
    id: 'll-notices',
    category: 'OPERATIONS',
    title: 'Resident Notices',
    subtitle: 'Publish announcements to your property residents',
    url: '/dashboard/landlord/notices',
    keywords: ['notices', 'announcements', 'broadcast'],
    icon: Megaphone,
  },
  {
    id: 'll-verification',
    category: 'ACCOUNT',
    title: 'ID & Title Deeds',
    subtitle: 'Ghana Card KYC & property ownership documents',
    url: '/dashboard/verification',
    keywords: ['verification', 'kyc', 'ghana card', 'deeds', 'title'],
    icon: ShieldCheck,
  },
  {
    id: 'll-notifications',
    category: 'ACCOUNT',
    title: 'Notifications',
    subtitle: 'Real-time alerts & system updates',
    url: '/dashboard/notifications',
    keywords: ['notifications', 'alerts', 'bell'],
    icon: Bell,
  },
  {
    id: 'll-profile',
    category: 'ACCOUNT',
    title: 'Profile & Settings',
    subtitle: 'Account details, security & 2FA settings',
    url: '/dashboard/profile',
    keywords: ['profile', 'settings', 'security', 'password', '2fa'],
    icon: User,
  },
];

const TENANT_ITEMS: PortalQuickItem[] = [
  {
    id: 'tn-dashboard',
    category: 'MY LIVING',
    title: 'Resident Dashboard',
    subtitle: 'Overview, active stay & quick actions',
    url: '/dashboard/tenant',
    keywords: ['dashboard', 'overview', 'home'],
    icon: LayoutDashboard,
  },
  {
    id: 'tn-residence',
    category: 'MY LIVING',
    title: 'My Residence',
    subtitle: 'WiFi, ECG meter, gate access & compound info',
    url: '/dashboard/tenant/residence',
    keywords: ['residence', 'wifi', 'ecg', 'gate', 'room', 'stay'],
    icon: Building2,
  },
  {
    id: 'tn-bookings',
    category: 'MY LIVING',
    title: 'My Bookings',
    subtitle: 'Active, upcoming & past accommodation bookings',
    url: '/dashboard/tenant/bookings',
    keywords: ['bookings', 'reservations', 'stays'],
    icon: CalendarCheck,
  },
  {
    id: 'tn-tickets',
    category: 'SERVICES',
    title: 'Maintenance & Repairs',
    subtitle: 'Submit or track plumbing, electrical & repair requests',
    url: '/dashboard/tenant/tickets',
    keywords: ['maintenance', 'tickets', 'repairs', 'plumbing', 'fault'],
    icon: Wrench,
  },
  {
    id: 'tn-bills',
    category: 'FINANCES',
    title: 'Bills & Split Payments',
    subtitle: 'Utility bills, shared splits & payment tracking',
    url: '/dashboard/tenant/bills',
    keywords: ['bills', 'utilities', 'split', 'electricity', 'water'],
    icon: Receipt,
  },
  {
    id: 'tn-invoices',
    category: 'FINANCES',
    title: 'Invoices & Receipts',
    subtitle: 'Download rent receipts & transaction records',
    url: '/dashboard/invoice',
    keywords: ['invoice', 'receipts', 'payments', 'rent'],
    icon: CreditCard,
  },
  {
    id: 'tn-agreements',
    category: 'DOCUMENTS',
    title: 'Tenancy Agreements',
    subtitle: 'View and sign digital lease agreements',
    url: '/dashboard/agreements',
    keywords: ['agreements', 'lease', 'contract', 'sign'],
    icon: FileText,
  },
  {
    id: 'tn-messages',
    category: 'COMMUNICATION',
    title: 'Messages',
    subtitle: 'Chat with landlords & support',
    url: '/dashboard/messages',
    keywords: ['messages', 'chat', 'inbox', 'landlord'],
    icon: MessageSquare,
  },
  {
    id: 'tn-wishlist',
    category: 'EXPLORE',
    title: 'Saved Wishlist',
    subtitle: 'Properties you bookmarked for later',
    url: '/dashboard/wishlist',
    keywords: ['wishlist', 'saved', 'favorites', 'bookmarks'],
    icon: Heart,
  },
  {
    id: 'tn-search',
    category: 'EXPLORE',
    title: 'Explore Properties',
    subtitle: 'Browse verified apartments & hostels',
    url: '/search',
    keywords: ['search', 'explore', 'properties', 'apartments', 'hostels'],
    icon: Compass,
  },
  {
    id: 'tn-notifications',
    category: 'ACCOUNT',
    title: 'Notifications',
    subtitle: 'Real-time booking & notice alerts',
    url: '/dashboard/notifications',
    keywords: ['notifications', 'alerts'],
    icon: Bell,
  },
  {
    id: 'tn-profile',
    category: 'ACCOUNT',
    title: 'Profile & Settings',
    subtitle: 'Personal info, KYC verification & security',
    url: '/dashboard/profile',
    keywords: ['profile', 'settings', 'security', 'kyc'],
    icon: User,
  },
];

export default function PortalGlobalSearch({
  portal,
  placeholder = 'Search portal...',
}: {
  portal: 'landlord' | 'tenant';
  placeholder?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = portal === 'landlord' ? LANDLORD_ITEMS : TENANT_ITEMS;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (item: PortalQuickItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 transition cursor-pointer"
        aria-label={placeholder}
      >
        <Search className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">{placeholder}</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Jump to ${portal} pages, bookings, settings...`}
                className="flex-1 bg-transparent text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-2 space-y-1">
              {results.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  No matching pages found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                results.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition cursor-pointer',
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{item.title}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
