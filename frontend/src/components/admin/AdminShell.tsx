'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Building,
  UserCheck,
  Users,
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  Receipt,
  Star,
  Scale,
  BarChart3,
  FileText,
  FileCheck,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import AdminGlobalSearch from './AdminGlobalSearch';

interface AdminNavGroup {
  title: string;
  links: {
    name: string;
    href: string;
    icon: React.ElementType;
    superAdminOnly?: boolean;
    badge?: number;
  }[];
}

interface AdminShellProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AdminShell({ user, onLogout, children }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin_sidebar_collapsed', String(next));
  };

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navGroups: AdminNavGroup[] = [
    {
      title: 'OVERVIEW',
      links: [
        { name: 'Command Centre', href: '/admin/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'MARKETPLACE',
      links: [
        { name: 'Property Listings', href: '/admin/properties', icon: Building }
      ]
    },
    {
      title: 'PEOPLE',
      links: [
        { name: 'Landlords & Owners', href: '/admin/landlords', icon: UserCheck },
        { name: 'Tenants & Residents', href: '/admin/tenants', icon: Users },
      ]
    },
    {
      title: 'TRUST & VERIFICATION',
      links: [
        { name: 'Ghana Card KYC', href: '/admin/verifications', icon: BadgeCheck },
        { name: 'Title Deeds & Ownership', href: '/admin/deeds', icon: FileCheck },
      ]
    },
    {
      title: 'OPERATIONS',
      links: [
        { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
        { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { name: 'Payments & Escrow', href: '/admin/transactions', icon: Receipt },
        { name: 'Review Moderation', href: '/admin/reviews', icon: Star },
        { name: 'Disputes & Support', href: '/admin/disputes', icon: Scale }
      ]
    },
    {
      title: 'INSIGHTS',
      links: [
        { name: 'Reports & Analytics', href: '/admin/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'GOVERNANCE',
      links: [
        { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
        { name: 'Administrators & Roles', href: '/admin/administrators', icon: ShieldAlert, superAdminOnly: true },
        { name: 'Platform Settings', href: '/admin/config', icon: Settings, superAdminOnly: true }
      ]
    }
  ];

  const renderNav = (isMobile: boolean = false) => (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0C1017] text-zinc-300">
      {/* Brand Logo Header */}
      <div className={clsx(
        'p-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0',
        collapsed && !isMobile ? 'justify-center' : ''
      )}>
        <Link href="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#0F5132] flex items-center justify-center shrink-0 shadow-xs border border-emerald-500/20">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={22}
              height={22}
              className="object-contain"
            />
          </div>
          {(!collapsed || isMobile) && (
            <div className="leading-tight">
              <span className="text-sm font-black text-white tracking-tight block">
                Akwaaba<span className="text-emerald-400">Admin</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                {isSuperAdmin ? 'Super Administrator' : 'Executive Console'}
              </span>
            </div>
          )}
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navGroups.map((group) => {
          // Filter out Super Admin only links if not Super Admin
          const visibleLinks = group.links.filter(
            (link) => !link.superAdminOnly || isSuperAdmin
          );
          if (visibleLinks.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1.5">
              {(!collapsed || isMobile) && (
                <div className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === '/admin/dashboard'
                      ? pathname === '/admin/dashboard'
                      : pathname.startsWith(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={collapsed && !isMobile ? link.name : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all group relative',
                        isActive
                          ? 'bg-[#0F5132] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60',
                        collapsed && !isMobile && 'justify-center px-2'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                        )}
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate flex-1">{link.name}</span>
                      )}
                      {link.superAdminOnly && (!collapsed || isMobile) && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          ROOT
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-zinc-800/80 shrink-0 bg-[#0A0D14]">
        <div className={clsx(
          'flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80',
          collapsed && !isMobile && 'justify-center p-1.5'
        )}>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-800/60">
            {user?.firstName?.[0] || 'A'}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] text-zinc-400 truncate font-mono">
                {user?.email}
              </div>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign out of Admin Console"
              className="p-1.5 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#FBFBFC] dark:bg-[#080A0E] overflow-hidden -mt-20">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={clsx(
          'hidden md:flex flex-col border-r border-zinc-800/80 transition-all duration-300 ease-in-out shrink-0 relative z-20',
          collapsed ? 'w-18' : 'w-64'
        )}
      >
        {renderNav(false)}

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition shadow-md z-30 cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderNav(true)}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Sticky Header */}
        <header className="h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0A0D14]/95 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
                Operations Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AdminGlobalSearch />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
