'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
}

export default function ModernSidebar({ user, groups, onLogout }: ModernSidebarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  // Derive portal name based on role
  const portalName = user?.role === 'ADMIN' 
    ? 'Admin Command' 
    : user?.role === 'LANDLORD' 
    ? 'Landlord Hub' 
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF') 
    ? 'Caretaker Ops' 
    : 'Resident Portal';

  return (
    <aside 
      className={clsx(
        "h-screen shrink-0 bg-[#0B0D12] text-zinc-100 border-r border-zinc-800/80 flex flex-col transition-all duration-200 ease-in-out z-20 select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header / Logo + Collapse Toggle */}
      <div className="h-18 flex items-center shrink-0 border-b border-zinc-800/80 transition-all px-4 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-zinc-700/60 shadow-xs shrink-0">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">
                Akwaaba<span className="text-[#198754]">Homes</span>
              </span>
            )}
          </Link>
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border border-transparent hover:border-zinc-700/50 shrink-0 ml-auto cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Workspace / Role Switcher */}
      <div className="px-3 py-3.5 shrink-0">
        <div 
          title={isCollapsed ? `${portalName} (${user.email || 'Account'})` : undefined}
          className={clsx(
            "w-full flex items-center rounded-xl bg-zinc-900/80 border border-zinc-800 transition-all group relative",
            isCollapsed ? "justify-center p-2" : "justify-between p-2.5"
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-emerald-950 border border-emerald-800/60 rounded-lg flex items-center justify-center text-emerald-400 font-extrabold text-xs shrink-0">
              {user.firstName ? user.firstName[0] : 'A'}{user.lastName ? user.lastName[0] : 'H'}
            </div>
            {!isCollapsed && (
              <div className="text-left overflow-hidden">
                <div className="text-xs font-bold text-zinc-100 truncate flex items-center gap-1.5">
                  <span>{portalName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{user.email || 'Verified Account'}</div>
              </div>
            )}
          </div>

          {/* Floating Tooltip when Collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-zinc-800">
              {portalName}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        <div className="space-y-5">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && !isCollapsed && (
                <h4 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  {group.title}
                </h4>
              )}
              {group.title && isCollapsed && (
                <div className="w-6 h-px bg-zinc-800 mx-auto my-2" />
              )}

              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="relative block group"
                    >
                      <div className={clsx(
                        "flex items-center rounded-xl transition-all relative",
                        isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2",
                        isActive 
                          ? "bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-800/50" 
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 font-medium"
                      )}>
                        <div className="flex items-center gap-2.5">
                          <Icon className={clsx(
                            "w-4 h-4 shrink-0 transition-colors", 
                            isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"
                          )} />
                          {!isCollapsed && (
                            <span className="text-xs">{link.name}</span>
                          )}
                        </div>

                        {/* Badge Count */}
                        {link.badge !== undefined && link.badge > 0 && (
                          <div className={clsx(
                            "bg-amber-500 text-zinc-950 font-black flex items-center justify-center",
                            isCollapsed 
                              ? "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px]" 
                              : "px-1.5 py-0.2 rounded-full text-[10px]"
                          )}>
                            {link.badge}
                          </div>
                        )}
                      </div>

                      {/* Active Left Indicator */}
                      {isActive && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
                      )}

                      {/* Collapsed Hover Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border border-zinc-800 flex items-center gap-2">
                          <span>{link.name}</span>
                          {link.badge !== undefined && link.badge > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold">
                              {link.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={clsx(
              "w-full flex items-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-colors font-medium text-xs group relative cursor-pointer",
              isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
            )}
          >
            <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}

            {/* Collapsed Tooltip for Sign Out */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 text-rose-300 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-zinc-800">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Footer User Profile */}
      <div className="p-3 shrink-0 border-t border-zinc-800/80">
        <div className={clsx("flex items-center group relative", isCollapsed ? "justify-center" : "justify-between px-1")}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-zinc-300">
              {user?.firstName?.[0] || 'U'}
            </div>
            {!isCollapsed && (
              <div className="text-left truncate">
                <div className="text-xs font-bold text-zinc-200 truncate">
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </div>
                <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>KYC Verified</span>
                </div>
              </div>
            )}
          </div>

          {/* Collapsed Tooltip for Profile */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 text-zinc-200 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-zinc-800">
              {user?.firstName || ''} {user?.lastName || ''} • KYC Verified
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
