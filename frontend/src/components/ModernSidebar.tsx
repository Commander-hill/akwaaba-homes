'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LogOut, ChevronLeft, ChevronRight, X, 
  Building, Compass, ShieldCheck, User as UserIcon,
  Sparkles, CheckCircle2, Home
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
    avatarUrl?: string | null;
    isVerifiedLandlord?: boolean;
    ghanaCardStatus?: string;
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

  const portalConfig = user?.role === 'ADMIN' 
    ? { name: 'Admin Console', badge: 'SuperAdmin', icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    : user?.role === 'LANDLORD' 
    ? { name: 'Landlord Hub', badge: 'Host & Landlord', icon: Building, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF') 
    ? { name: 'Caretaker Ops', badge: 'Operations Staff', icon: Sparkles, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    : { name: 'Resident Portal', badge: 'Student & Resident', icon: Home, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };

  const userDisplayName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : 'Valued Resident';

  const userInitials = (user?.firstName?.[0] || 'A') + (user?.lastName?.[0] || 'H');
  const isVerified = user?.isVerifiedLandlord || user?.ghanaCardStatus === 'VERIFIED';

  // Inner navigation content used by both Desktop and Mobile Drawer
  const renderNavContent = (collapsed: boolean, isMobile: boolean = false) => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0D0F14] text-zinc-200">
      {/* ── 1. USER PROFILE IDENTITY PILL ── */}
      <div className="px-3 pt-3 pb-2 shrink-0 border-b border-zinc-800/60">
        <div className={clsx(
          "flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 transition-all",
          collapsed && "justify-center p-1.5"
        )}>
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={userDisplayName} 
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/40" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-[#0F5132] text-white font-bold text-xs flex items-center justify-center shadow-xs ring-1 ring-emerald-400/30">
                {userInitials.toUpperCase()}
              </div>
            )}
            {isVerified && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-[#0D0F14]" title="Verified Account">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-zinc-100 truncate">
                  {userDisplayName}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {user?.email || portalConfig.badge}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. SCROLLABLE NAVIGATION ITEMS ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.title && !collapsed && (
              <h5 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                {group.title}
              </h5>
            )}
            {group.title && collapsed && (
              <div className="w-5 h-px bg-zinc-800 mx-auto my-2" />
            )}

            <div className="space-y-1">
              {group.links.map((link) => {
                const Icon = link.icon;
                const [linkPath, linkQuery] = link.href.split('?');
                const linkTab = linkQuery ? new URLSearchParams(linkQuery).get('tab') : null;
                const currentTab = searchParams ? searchParams.get('tab') : null;

                let isActive = false;
                if (linkTab) {
                  isActive = pathname === linkPath && currentTab === linkTab;
                } else if (pathname === linkPath) {
                  isActive = !currentTab;
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => {
                      if (isMobile && onMobileClose) onMobileClose();
                    }}
                    className={clsx(
                      "w-full flex items-center rounded-xl text-xs font-medium transition-all duration-150 relative group select-none",
                      collapsed ? "justify-center p-2.5 my-1" : "gap-3 px-3 py-2.5 my-0.5",
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 to-[#0F5132] text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-500/40"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                    )}
                    title={collapsed ? link.name : undefined}
                  >
                    <Icon className={clsx(
                      "w-4 h-4 shrink-0 transition-colors", 
                      isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-100"
                    )} />

                    {!collapsed && (
                      <span className="truncate text-[13px]">{link.name}</span>
                    )}

                    {/* Notification Badge */}
                    {link.badge !== undefined && link.badge > 0 && (
                      <div className={clsx(
                        "ml-auto bg-amber-500 text-zinc-950 font-black flex items-center justify-center shadow-xs",
                        collapsed 
                          ? "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px]" 
                          : "px-2 py-0.5 rounded-full text-[10px]"
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

      {/* ── 3. PINNED BOTTOM ACTION CONTROLS ── */}
      <div className="shrink-0 border-t border-zinc-800/80 p-2.5 space-y-1 bg-[#090B0E]">
        {/* Marketplace Link */}
        <Link
          href="/properties"
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
          }}
          title={collapsed ? "Browse Properties" : undefined}
          className={clsx(
            "w-full flex items-center rounded-xl text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors font-medium",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
          )}
        >
          <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsed && <span className="text-[13px]">Explore Properties</span>}
        </Link>

        {/* Sign Out Action */}
        <button
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
            onLogout();
          }}
          title={collapsed ? "Sign Out" : undefined}
          className={clsx(
            "w-full flex items-center rounded-xl text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors font-medium cursor-pointer",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4 text-zinc-500 hover:text-rose-400 shrink-0" />
          {!collapsed && <span className="text-[13px]">Sign Out</span>}
        </button>

        {/* Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={clsx(
              "w-full flex items-center rounded-xl text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer pt-1",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span className="text-[13px]">Collapse Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── 1. DESKTOP SIDEBAR ── */}
      <aside 
        className={clsx(
          "hidden md:flex h-screen shrink-0 bg-[#0D0F14] text-zinc-100 border-r border-zinc-800/80 flex-col transition-all duration-200 ease-in-out z-20 select-none",
          isCollapsed ? "w-18" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center shrink-0 border-b border-zinc-800/80 px-4 justify-between bg-[#090B0E]">
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-[#0F5132] border border-emerald-400/40 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shadow-xs shrink-0">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={22}
                height={22}
                className="w-5 h-5 object-contain"
                priority
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white tracking-tight leading-none">
                    Akwaaba<span className="text-emerald-400">Homes</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={clsx("px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider border", portalConfig.color)}>
                    {portalConfig.name}
                  </span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {renderNavContent(isCollapsed, false)}
      </aside>

      {/* ── 2. MOBILE SLIDE DRAWER ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          <aside className="relative w-72 max-w-[85vw] bg-[#0D0F14] text-zinc-100 border-r border-zinc-800/80 h-full flex flex-col shadow-2xl z-10 select-none">
            <div className="h-16 flex items-center shrink-0 border-b border-zinc-800/80 px-4 justify-between bg-[#090B0E]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-[#0F5132] border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="Akwaaba Homes"
                    width={22}
                    height={22}
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-white tracking-tight">
                    Akwaaba<span className="text-emerald-400">Homes</span>
                  </span>
                  <div className="mt-0.5">
                    <span className={clsx("px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider border", portalConfig.color)}>
                      {portalConfig.name}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
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
