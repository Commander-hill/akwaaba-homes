'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LogOut, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, X, 
  Building, Zap, Compass, ShieldCheck, Wrench 
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export interface SidebarLink {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export interface SidebarGroup {
  title?: string;
  links: SidebarLink[];
}

interface ModernSidebarProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
    email?: string;
  };
  groups: SidebarGroup[];
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function ModernSidebar({ user, groups, onLogout, mobileOpen, onMobileClose }: ModernSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Sync collapsed state with localStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Auto-close mobile drawer when route/pathname changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname, searchParams]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  // Derive portal and user display details matching Neon
  const portalName = user?.role === 'ADMIN' 
    ? 'Admin Command' 
    : user?.role === 'LANDLORD' 
    ? 'Landlord Hub' 
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF') 
    ? 'Caretaker Ops' 
    : 'Resident Portal';

  const userDisplayName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : 'Captain Israel';

  const roleBadge = user?.role === 'LANDLORD'
    ? 'Landlord'
    : user?.role === 'ADMIN'
    ? 'Admin'
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF')
    ? 'Staff'
    : 'Resident';

  const primaryAction = user?.role === 'LANDLORD'
    ? { name: 'List Property', href: '/dashboard/landlord/new', icon: Zap }
    : user?.role === 'ADMIN'
    ? { name: 'Admin Hub', href: '/admin/dashboard', icon: Zap }
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF')
    ? { name: 'Operations Hub', href: '/dashboard/caretaker', icon: Wrench }
    : { name: 'Explore Homes', href: '/properties', icon: Compass };

  // Inner navigation content used by both Desktop and Mobile Drawer
  const renderNavContent = (collapsed: boolean, isMobile: boolean = false) => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#121417]">
      {/* ── 1. PRIMARY ACTION BUTTON (Neon's "Connect" Button Style) ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 px-1">
          {!collapsed && 'PROJECT'}
        </div>
        <Link
          href={primaryAction.href}
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
          }}
          className={clsx(
            "w-full flex items-center justify-center rounded-lg bg-[#0F5132] hover:bg-[#0A3D24] text-white border border-[#198754]/40 font-bold text-xs transition-all shadow-xs group",
            collapsed ? "h-9 w-9 p-0 mx-auto" : "h-9 px-3 gap-2"
          )}
          title={collapsed ? primaryAction.name : undefined}
        >
          <primaryAction.icon className="w-3.5 h-3.5 text-emerald-300 shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && (
            <span className="truncate tracking-tight">{primaryAction.name}</span>
          )}
        </Link>
      </div>

      {/* ── 2. CONTEXT SELECTOR (Neon's "BRANCH production ⬍" Style) ── */}
      <div className="px-3 pb-2 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 px-1">
          {!collapsed && 'BRANCH'}
        </div>
        <div 
          title={collapsed ? portalName : undefined}
          className={clsx(
            "w-full flex items-center rounded-lg bg-[#181B20] border border-zinc-800 text-zinc-200 text-xs font-medium transition-colors hover:border-zinc-700 select-none",
            collapsed ? "justify-center p-2" : "justify-between px-3 py-2"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {!collapsed && (
              <span className="truncate font-semibold text-zinc-200">
                {portalName.toLowerCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          )}
        </div>
      </div>

      {/* ── 3. SCROLLABLE NAVIGATION SECTIONS ── */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 scrollbar-none">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.title && !collapsed && (
              <h4 className="px-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 mt-2">
                {group.title}
              </h4>
            )}
            {group.title && collapsed && (
              <div className="w-6 h-px bg-zinc-800/80 mx-auto my-2" />
            )}

            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                const [linkPath, linkQuery] = link.href.split('?');
                const linkTab = linkQuery ? new URLSearchParams(linkQuery).get('tab') : null;
                const currentTab = searchParams ? searchParams.get('tab') : null;

                let isActive = false;
                if (linkTab) {
                  isActive = pathname === linkPath && currentTab === linkTab;
                } else if (pathname === linkPath) {
                  isActive = !currentTab || (linkPath === '/dashboard/tenant' && currentTab === 'bookings');
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => {
                      if (isMobile && onMobileClose) onMobileClose();
                    }}
                    className={clsx(
                      "w-full flex items-center rounded-md text-xs transition-colors relative group",
                      collapsed ? "justify-center p-2 my-0.5" : "gap-2.5 px-2.5 py-1.5 my-0.5",
                      isActive
                        ? "bg-[#272B33] text-white font-semibold border border-zinc-700/60 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60 font-normal"
                    )}
                    title={collapsed ? link.name : undefined}
                  >
                    <Icon className={clsx(
                      "w-4 h-4 shrink-0 transition-colors", 
                      isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                    )} />

                    {!collapsed && (
                      <span className="truncate text-[13px]">{link.name}</span>
                    )}

                    {/* Badge Count */}
                    {link.badge !== undefined && link.badge > 0 && (
                      <div className={clsx(
                        "ml-auto bg-amber-500 text-zinc-950 font-black flex items-center justify-center",
                        collapsed 
                          ? "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px]" 
                          : "px-1.5 py-0.2 rounded-full text-[10px]"
                      )}>
                        {link.badge}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. PINNED BOTTOM ACTIONS (Neon-Style Collapse Menu) ── */}
      <div className="shrink-0 border-t border-zinc-800/80 p-2 space-y-0.5 bg-[#121417]">
        {/* Sign Out Row */}
        <button
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
            onLogout();
          }}
          title={collapsed ? "Sign Out" : undefined}
          className={clsx(
            "w-full flex items-center rounded-md text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors font-normal cursor-pointer",
            collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"
          )}
        >
          <LogOut className="w-4 h-4 text-zinc-500 hover:text-rose-400 shrink-0" />
          {!collapsed && <span className="text-[13px]">Sign Out</span>}
        </button>

        {/* Collapse Menu Toggle Button */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className={clsx(
              "w-full flex items-center rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-zinc-400" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-zinc-400" />
                <span className="text-[13px]">Collapse menu</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── 1. DESKTOP SIDEBAR (Visible on md and up) ── */}
      <aside 
        className={clsx(
          "hidden md:flex h-screen shrink-0 bg-[#121417] text-zinc-100 border-r border-zinc-800/80 flex-col transition-all duration-200 ease-in-out z-20 select-none",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Neon-Style Header: Logo / Username Badge */}
        <div className="h-14 flex items-center shrink-0 border-b border-zinc-800/80 px-3.5 gap-2 justify-between">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {/* Square Neon Logo Emblem */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#0F5132]/30 border border-[#198754]/50 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Akwaaba Homes"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  priority
                />
              </div>
            </Link>

            {!isCollapsed && (
              <>
                <span className="text-zinc-600 select-none font-light text-sm">/</span>
                <span className="font-semibold text-xs text-zinc-100 truncate tracking-tight">
                  {userDisplayName}
                </span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 shrink-0">
                  {roleBadge}
                </span>
              </>
            )}
          </div>
        </div>

        {renderNavContent(isCollapsed, false)}
      </aside>

      {/* ── 2. MOBILE OFF-CANVAS SLIDE DRAWER (Triggered by mobileOpen) ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <aside className="relative w-72 max-w-[85vw] bg-[#121417] text-zinc-100 border-r border-zinc-800/80 h-full flex flex-col shadow-2xl z-10 animate-in select-none">
            <div className="h-14 flex items-center shrink-0 border-b border-zinc-800/80 px-4 justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#0F5132]/30 border border-[#198754]/50 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="Akwaaba Homes"
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <span className="text-zinc-600 font-light text-sm">/</span>
                <span className="font-semibold text-xs text-zinc-100 truncate">
                  {userDisplayName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  {roleBadge}
                </span>
              </div>

              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
