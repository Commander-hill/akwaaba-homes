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
    <div className="w-64 h-screen shrink-0 bg-gradient-to-b from-[#2E1065] via-[#4C1D95] to-[#701A75] text-white border-r border-white/10 flex flex-col transition-colors z-20 shadow-2xl">
      
      {/* Header / Logo */}
      <div className="h-20 flex items-center px-6 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2.5">
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
          <span className="font-extrabold text-xl tracking-tight text-white drop-shadow-sm">
            Akwaaba<span className="text-amber-300">Homes</span>
          </span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 shrink-0">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all shadow-sm"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 border border-white/20">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{portalName}</div>
              <div className="text-xs text-white/70 truncate">{user.email || 'Personal Account'}</div>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-white/70 shrink-0" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        <div className="space-y-6">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && (
                <h4 className="px-3 text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
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
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all",
                        isActive 
                          ? "bg-white/20 text-white font-bold shadow-lg backdrop-blur-md border border-white/20" 
                          : "text-white/75 hover:bg-white/10 hover:text-white font-medium"
                      )}>
                        <div className="flex items-center gap-3">
                          <Icon className={clsx("w-5 h-5", isActive ? "text-amber-300" : "text-white/70")} />
                          <span className="text-sm">{link.name}</span>
                        </div>
                        {link.badge !== undefined && link.badge > 0 && (
                          <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                            {link.badge}
                          </div>
                        )}
                      </div>
                      
                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-400 rounded-l-full shadow-[0_0_10px_#F59E0B]" />
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/25 transition-all font-bold text-sm shadow-sm"
          >
            <LogOut className="w-5 h-5 text-rose-300" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Footer User Profile & Storage Card */}
      <div className="p-4 shrink-0 border-t border-white/10">
        
        {/* Stats / Plan Card */}
        <div className="mb-4 p-4 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 overflow-hidden relative group shadow-inner">
          <div className="relative z-10">
            <h4 className="text-sm font-extrabold text-white mb-0.5">Premium Plan</h4>
            <p className="text-xs text-white/70 mb-3">{user.role} Access active</p>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 w-3/4 rounded-full shadow-[0_0_8px_#F59E0B]" />
            </div>
          </div>
        </div>

        {/* User Footer Action */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/30">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName}%20${user.lastName}&backgroundColor=6366f1`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="text-left truncate">
              <div className="text-sm font-bold text-white truncate">{user.firstName} {user.lastName}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
