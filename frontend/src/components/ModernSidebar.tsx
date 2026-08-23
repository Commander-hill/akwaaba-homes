'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Check, ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
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

  // Derive portal name based on role
  const portalName = user.role === 'ADMIN' ? 'Admin Portal' : user.role === 'LANDLORD' ? 'Landlord Portal' : 'Tenant Portal';

  return (
    <div className="w-64 h-screen shrink-0 bg-white dark:bg-[#111111] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors z-20">
      
      {/* Header / Logo */}
      <div className="h-20 flex items-center px-6 shrink-0 border-b border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-[var(--primary)]/20 shrink-0">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            Akwaaba<span className="text-[var(--primary)]">Homes</span>
          </span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 shrink-0">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center text-[var(--primary)] font-bold text-sm shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{portalName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email || 'Personal Account'}</div>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        <div className="space-y-6">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && (
                <h4 className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {group.title}
                </h4>
              )}
              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="relative block"
                    >
                      <div className={clsx(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
                        isActive 
                          ? "bg-indigo-50/80 dark:bg-[var(--primary)]/10 text-[var(--primary)] dark:text-[var(--primary)] font-semibold" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                      )}>
                        <div className="flex items-center gap-3">
                          <Icon className={clsx("w-5 h-5", isActive ? "text-[var(--primary)]" : "text-slate-400")} />
                          <span className="text-sm">{link.name}</span>
                        </div>
                        {link.badge !== undefined && link.badge > 0 && (
                          <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            {link.badge}
                          </div>
                        )}
                      </div>
                      
                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--primary)] rounded-l-full shadow-[0_0_8px_var(--primary)] shadow-[var(--primary)]/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Prominent Logout Button in Menu */}
        <div className="mt-8 px-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Footer User Profile & Storage Card */}
      <div className="p-4 shrink-0 border-t border-slate-100 dark:border-slate-800/50">
        
        {/* Optional Stats Card could go here */}
        <div className="mb-4 p-4 rounded-xl bg-slate-900 dark:bg-slate-800/50 border border-slate-800 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50" />
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-white mb-1">Premium Plan</h4>
            <p className="text-xs text-slate-400 mb-3">{user.role} Access active</p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-3/4" />
            </div>
          </div>
        </div>

        {/* User Footer Action */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName}%20${user.lastName}&backgroundColor=6366f1`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="text-left truncate">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.firstName}</div>
            </div>
          </div>
          {/* We removed the small logout icon from here since we added a prominent one in the menu above */}
        </div>

      </div>
    </div>
  );
}
