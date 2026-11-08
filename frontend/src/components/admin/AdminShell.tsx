'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Banknote,
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
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Megaphone,
  Radio,
  Wrench,
  Power,
  ChevronDown,
  Sun,
  Moon,
  Home,
  User,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';
import NotificationBell from '@/components/NotificationBell';
import AdminGlobalSearch from './AdminGlobalSearch';

interface AdminNavGroup {
  title: string;
  links: {
    name: string;
    href: string;
    icon: React.ElementType;
    superAdminOnly?: boolean;
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
  const pathname = usePathname() || '';
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile drawer and dropdown on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  // Click outside to dismiss profile dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Action Queue Query for dynamic sidebar count badges
    const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    };

    socket.on('admin_action_required', handleInvalidate);
    socket.on('kyc_submitted', handleInvalidate);
    socket.on('property_created', handleInvalidate);
    socket.on('breach_reported', handleInvalidate);
    socket.on('booking_updated', handleInvalidate);

    return () => {
      socket.off('admin_action_required', handleInvalidate);
      socket.off('kyc_submitted', handleInvalidate);
      socket.off('property_created', handleInvalidate);
      socket.off('breach_reported', handleInvalidate);
      socket.off('booking_updated', handleInvalidate);
    };
  }, [socket, queryClient]);

  const { data: actionQueue = [] } = useQuery({
    queryKey: ['admin-action-queue'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/action-queue');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const getBadgeCount = (href: string): number => {
    if (!Array.isArray(actionQueue) || actionQueue.length === 0) return 0;
    if (href === '/admin/users') {
      return actionQueue.filter(
        (a: any) => a.category === 'UNLOCK_REQUEST' || a.id?.includes('unlock')
      ).length;
    }
    if (href === '/admin/verifications') {
      return actionQueue.filter(
        (a: any) => a.category === 'KYC_VERIFICATION' || a.category === 'IDENTITY_KYC' || a.id?.includes('kyc') || a.id?.includes('user')
      ).length;
    }
    if (href === '/admin/deeds') {
      return actionQueue.filter(
        (a: any) => a.category === 'LANDLORD_VERIFICATION' || a.id?.includes('landlord')
      ).length;
    }
    if (href === '/admin/properties') {
      return actionQueue.filter(
        (a: any) => a.category === 'PROPERTY_APPROVAL' || a.id?.includes('property')
      ).length;
    }
    if (href === '/admin/tickets') {
      return actionQueue.filter(
        (a: any) => a.category === 'MAINTENANCE_ESCALATION' || a.id?.includes('ticket')
      ).length;
    }
    if (href === '/admin/disputes') {
      return actionQueue.filter(
        (a: any) => a.category === 'BREACH_REPORT' || a.category === 'DISPUTE' || a.id?.includes('breach') || a.id?.includes('dispute')
      ).length;
    }
    return 0;
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const fullName = `${user?.firstName || 'System'} ${user?.lastName || 'Administrator'}`.trim();
  const initials = `${user?.firstName?.[0] || 'A'}${user?.lastName?.[0] || 'D'}`.toUpperCase();

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
        { name: 'All Users Directory', href: '/admin/users', icon: Users },
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
        { name: 'Payments & Ledger', href: '/admin/transactions', icon: Receipt },
        { name: 'Disbursements & Payouts', href: '/admin/payouts', icon: Banknote },
        { name: 'Maintenance & Repairs', href: '/admin/tickets', icon: Wrench },
        { name: 'Review Moderation', href: '/admin/reviews', icon: Star },
        { name: 'Disputes & Lease Breaches', href: '/admin/disputes', icon: Scale },
      ]
    },
    {
      title: 'COMMUNICATIONS',
      links: [
        { name: 'Notices & Announcements', href: '/admin/notices', icon: Megaphone },
        { name: 'Live Broadcasts & Alerts', href: '/admin/broadcasts', icon: Radio },
      ]
    },
    {
      title: 'INSIGHTS & TELEMETRY',
      links: [
        { name: 'Reports & Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Live Activity Stream', href: '/admin/activity', icon: Activity },
      ]
    },
    {
      title: 'GOVERNANCE',
      links: [
        { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
        { name: 'Maintenance Mode', href: '/admin/maintenance', icon: Power },
        { name: 'Administrators & Roles', href: '/admin/administrators', icon: ShieldAlert, superAdminOnly: true },
        { name: 'Platform Settings', href: '/admin/config', icon: Settings, superAdminOnly: true }
      ]
    }
  ];

  const getCurrentPageTitle = (path: string): string => {
    if (path === '/admin/dashboard') return 'Command Centre';
    if (path === '/admin/properties') return 'Property Listings';
    if (path.startsWith('/admin/properties/')) return 'Property Inspection';
    if (path === '/admin/users') return 'All Users Directory';
    if (path === '/admin/landlords') return 'Landlords & Owners';
    if (path.startsWith('/admin/landlords/')) return 'Landlord Portfolio';
    if (path === '/admin/tenants') return 'Tenants & Residents';
    if (path.startsWith('/admin/tenants/')) return 'Tenant Dossier';
    if (path === '/admin/verifications') return 'Ghana Card KYC';
    if (path.startsWith('/admin/verifications/')) return 'Ghana Card KYC Dossier';
    if (path === '/admin/deeds') return 'Title Deeds & Ownership';
    if (path.startsWith('/admin/deeds/')) return 'Title Deed Audit';
    if (path === '/admin/bookings') return 'Bookings';
    if (path.startsWith('/admin/bookings/')) return 'Booking Docket';
    if (path === '/admin/subscriptions') return 'Subscriptions';
    if (path.startsWith('/admin/subscriptions/')) return 'Subscription License';
    if (path === '/admin/transactions') return 'Payments & Ledger';
    if (path === '/admin/payouts') return 'Disbursements & Payouts';
    if (path.startsWith('/admin/transactions/')) return 'Transaction Receipt & Ledger';
    if (path === '/admin/tickets') return 'Maintenance & Repairs';
    if (path.startsWith('/admin/tickets/')) return 'Maintenance Ticket Docket';
    if (path === '/admin/reviews') return 'Review Moderation';
    if (path.startsWith('/admin/reviews/')) return 'Review Dispute';
    if (path === '/admin/disputes') return 'Disputes & Lease Breaches';
    if (path.startsWith('/admin/disputes/')) return 'Dispute Tribunal Hearing';
    if (path.startsWith('/admin/breaches')) return 'Disputes & Lease Breaches';
    if (path === '/admin/notices') return 'Notices & Announcements';
    if (path.startsWith('/admin/notices/new')) return 'Draft Statutory Notice';
    if (path.startsWith('/admin/broadcasts')) return 'Live Broadcasts';
    if (path.startsWith('/admin/analytics')) return 'Reports & Analytics';
    if (path.startsWith('/admin/activity')) return 'Live Activity Stream';
    if (path.startsWith('/admin/audit')) return 'Audit Logs';
    if (path.startsWith('/admin/maintenance')) return 'Maintenance Mode';
    if (path.startsWith('/admin/administrators')) return 'Administrators & Roles';
    if (path.startsWith('/admin/config')) return 'Platform Settings';
    return path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard';
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#12151D] text-zinc-900 dark:text-zinc-100 relative overflow-hidden select-none">
      {/* Brand Header matching Resident Portal */}
      <div className="h-20 px-6 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-800/80">
        <Link href="/admin/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={42}
              height={42}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-black text-zinc-950 dark:text-white tracking-tight block leading-none">
              AkwaabaHomes
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-1 tracking-wide uppercase">
              Admin Operations Portal
            </span>
          </div>
        </Link>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Scrollable Body matching Resident Portal Link Styling */}
      <nav aria-label="Admin Navigation" className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleLinks = group.links.filter(
            (link) => !link.superAdminOnly || isSuperAdmin
          );
          if (visibleLinks.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <div className="px-3.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const active =
                    link.href === '/admin/dashboard'
                      ? pathname === '/admin/dashboard'
                      : pathname.startsWith(link.href);
                  const badgeCount = getBadgeCount(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 select-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                        active
                          ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 font-semibold border border-[#BBF7D0] dark:border-emerald-800/60 shadow-2xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-[#15803D] dark:hover:text-emerald-300 hover:bg-[#DCFCE7]/40 dark:hover:bg-emerald-950/30 hover:border-[#BBF7D0]/40 font-medium border border-transparent active:bg-[#DCFCE7] active:text-[#15803D] active:border-[#BBF7D0]'
                      )}
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <Icon
                          className={clsx(
                            'w-4.5 h-4.5 shrink-0 stroke-[2] transition-colors',
                            active
                              ? 'text-[#15803D] dark:text-emerald-300'
                              : 'text-zinc-400 dark:text-zinc-500 stroke-[1.8] group-hover:text-[#15803D] dark:group-hover:text-emerald-300'
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{link.name}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {link.superAdminOnly && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold">
                            ROOT
                          </span>
                        )}
                        {badgeCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#E0533C] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Institutional Security / Compliance Desk Card matching Resident Portal pattern */}
      <div className="p-4 mt-auto shrink-0">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2]" />
          </div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
            Admin Security Desk
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed px-1">
            Act 843 &amp; 256-bit TLS Protected
          </p>
          <Link
            href="/admin/audit"
            onClick={onNavigate}
            className="w-full py-2.5 px-3 mt-1 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <span>Audit Log Protocol</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Bottom Geometric Kente Textile Trim matching Resident Portal */}
      <div className="relative w-full h-7 shrink-0 overflow-hidden opacity-90 select-none pointer-events-none">
        <Image
          src="/images/agreements/kente-sidebar-pattern.png"
          alt="Ghanaian Kente Texture"
          fill
          sizes="256px"
          className="object-cover object-bottom"
        />
      </div>
    </div>
  );

  return (
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* ── DESKTOP SIDEBAR (Stationary, Clean Responsive Design System) ── */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col bg-white dark:bg-[#12151D] border-r border-zinc-200 dark:border-zinc-800 sticky top-0 h-screen z-20 shadow-xs overflow-hidden">
        {renderSidebarContent()}
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full flex flex-col bg-white dark:bg-[#12151D] z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(() => setMobileDrawerOpen(false))}
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching Resident Portal Architecture */}
        <header className="h-16 bg-white dark:bg-[#141816] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile Drawer Trigger, Breadcrumbs & Live Pulse */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation matching Resident Portal */}
            <div className="flex items-center gap-1.5 text-xs text-[#526357] dark:text-zinc-400 shrink-0">
              <Home className="w-4 h-4 text-[#16A34A]" />
              <Link href="/admin/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-200 font-medium">
                Admin Portal
              </Link>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="font-bold text-zinc-900 dark:text-white capitalize truncate max-w-[140px] sm:max-w-none">
                {getCurrentPageTitle(pathname)}
              </span>
            </div>

            {/* Live Operational Status Pulse */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold">
                Operations Live
              </span>
            </div>
          </div>

          {/* Right: Search, Theme Toggle, Notification Bell, User Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3.5 ml-4 shrink-0">
            <AdminGlobalSearch />

            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
              aria-label="Toggle dark mode"
              title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Administrator Profile Block with Dropdown matching Resident Portal */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800/60 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#0B7A46] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-2xs border border-[#0B7A46]">
                  {user?.avatarUrl ? (
                    <img
                      src={getImageUrl(user.avatarUrl)}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-zinc-950 dark:text-white leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                  </p>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-0.5" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="font-bold text-zinc-950 dark:text-white truncate">{fullName}</p>
                    <p className="text-[11px] text-zinc-500 truncate font-mono mt-0.5">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                    </span>
                  </div>

                  <Link
                    href="/admin/config"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Platform Settings</span>
                  </Link>

                  <Link
                    href="/admin/audit"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Audit Logs</span>
                  </Link>

                  <Link
                    href="/admin/activity"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Live Activity</span>
                  </Link>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {mounted && resolvedTheme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-zinc-500" />
                      )}
                      <span>Appearance</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 capitalize">
                      {mounted ? resolvedTheme : 'Auto'}
                    </span>
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
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
