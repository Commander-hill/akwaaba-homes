'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const portalName = user?.role === 'ADMIN' ? 'Admin Portal' : user?.role === 'LANDLORD' ? 'Landlord Portal' : 'Tenant Portal';

  return (
    <aside 
      className={clsx(
        "h-screen shrink-0 bg-gradient-to-b from-[#1E0B36] via-[#331363] to-[#4C1252] text-white border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out z-20 shadow-2xl relative select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header / Logo + Collapse Toggle */}
      <div className={clsx("h-20 flex items-center shrink-0 border-b border-white/10 transition-all px-4 justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/20 shrink-0">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          {!isCollapsed && (
            <span className="font-extrabold text-xl tracking-tight text-white drop-shadow-sm whitespace-nowrap animate-in fade-in duration-200">
              Akwaaba<span className="text-amber-300">Homes</span>
            </span>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all border border-white/10 shrink-0 active:scale-95 ml-auto"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-amber-300" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-white/70" />
          )}
        </button>
      </div>

      {/* Workspace / Role Switcher */}
      <div className="px-3 py-4 shrink-0">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title={isCollapsed ? `${portalName} (${user.email || 'Account'})` : undefined}
          className={clsx(
            "w-full flex items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all shadow-sm group relative",
            isCollapsed ? "justify-center p-2" : "justify-between p-2.5"
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold text-xs shrink-0 border border-white/30 shadow-md">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!isCollapsed && (
              <div className="text-left overflow-hidden">
                <div className="text-sm font-bold text-white truncate">{portalName}</div>
                <div className="text-xs text-white/70 truncate">{user.email || 'Personal Account'}</div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <ChevronsUpDown className="w-4 h-4 text-white/70 shrink-0" />
          )}

          {/* Floating Tooltip when Collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
              {portalName}
            </div>
          )}
        </button>
      </div>

      {/* Scrollable Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        <div className="space-y-6">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && !isCollapsed && (
                <h4 className="px-3 text-[10px] font-extrabold text-white/50 uppercase tracking-widest mb-2">
                  {group.title}
                </h4>
              )}
              {group.title && isCollapsed && (
                <div className="w-8 h-px bg-white/10 mx-auto my-3" />
              )}

              <div className="space-y-1.5">
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
                        isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5",
                        isActive 
                          ? "bg-white/20 text-white font-bold shadow-lg backdrop-blur-md border border-white/25" 
                          : "text-white/75 hover:bg-white/10 hover:text-white font-medium"
                      )}>
                        <div className="flex items-center gap-3">
                          <Icon className={clsx("w-5 h-5 shrink-0 transition-colors", isActive ? "text-amber-300" : "text-white/70 group-hover:text-white")} />
                          {!isCollapsed && (
                            <span className="text-sm">{link.name}</span>
                          )}
                        </div>

                        {/* Badge Count */}
                        {link.badge !== undefined && link.badge > 0 && (
                          <div className={clsx(
                            "bg-rose-500 text-white font-extrabold shadow-sm flex items-center justify-center",
                            isCollapsed 
                              ? "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px]" 
                              : "w-5 h-5 rounded-full text-[10px]"
                          )}>
                            {link.badge}
                          </div>
                        )}
                      </div>

                      {/* Active Indicator Line */}
                      {isActive && !isCollapsed && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-400 rounded-l-full shadow-[0_0_10px_#F59E0B]" />
                      )}

                      {/* Collapsed Hover Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border border-white/10 flex items-center gap-2">
                          <span>{link.name}</span>
                          {link.badge !== undefined && link.badge > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] font-bold">
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
        <div className="mt-8">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={clsx(
              "w-full flex items-center rounded-xl text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/25 transition-all font-bold text-sm shadow-sm group relative",
              isCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
            )}
          >
            <LogOut className="w-5 h-5 text-rose-300 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}

            {/* Collapsed Tooltip for Sign Out */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-rose-950 text-rose-100 text-xs font-bold rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-rose-800/40">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Footer User Profile */}
      <div className="p-3 shrink-0 border-t border-white/10">
        {!isCollapsed && (
          <div className="mb-3 p-3 rounded-xl bg-black/30 backdrop-blur-md border border-white/15 relative overflow-hidden shadow-inner">
            <h4 className="text-xs font-extrabold text-white mb-0.5">Premium Plan</h4>
            <p className="text-[11px] text-white/70 mb-2">{user?.role || 'User'} Access active</p>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 w-3/4 rounded-full shadow-[0_0_8px_#F59E0B]" />
            </div>
          </div>
        )}

        <div className={clsx("flex items-center group relative", isCollapsed ? "justify-center" : "justify-between px-1")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/30 shadow-md">
              <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName || 'A'}%20${user?.lastName || 'H'}&backgroundColor=6366f1`} 
                alt="avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            {!isCollapsed && (
              <div className="text-left truncate">
                <div className="text-sm font-bold text-white truncate">{user?.firstName || 'User'} {user?.lastName || ''}</div>
              </div>
            )}
          </div>

          {/* Collapsed Tooltip for Profile */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
              {user?.firstName || ''} {user?.lastName || ''} ({user?.role || ''})
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
