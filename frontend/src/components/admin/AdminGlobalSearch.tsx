'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Loader2,
  X,
  Building,
  Users,
  CalendarCheck,
  CreditCard,
  ArrowRight,
  Megaphone,
  Radio,
  Wrench,
  Power,
  Settings,
} from 'lucide-react';
import api from '@/lib/axios';
import clsx from 'clsx';
import AdminStatusBadge from './AdminStatusBadge';

interface SearchResult {
  id: string;
  type: 'LANDLORD' | 'TENANT' | 'ADMIN' | 'PROPERTY' | 'BOOKING' | 'TRANSACTION' | 'GOVERNANCE' | 'OPERATIONS' | 'COMMUNICATIONS' | string;
  title: string;
  subtitle: string;
  status: string;
  url: string;
}

const STATIC_ADMIN_PAGES = [
  {
    id: 'page-maintenance-mode',
    type: 'GOVERNANCE',
    title: 'Platform Maintenance Mode',
    subtitle: 'Activate/deactivate global maintenance mode & countdown timer',
    status: 'PAGE',
    url: '/admin/maintenance',
    keywords: ['maintenance', 'mode', 'system', 'offline', 'timer', 'downtime', 'outage'],
  },
  {
    id: 'page-maintenance-tickets',
    type: 'OPERATIONS',
    title: 'Property Maintenance & Repairs Hub',
    subtitle: 'Manage resident repairs, work orders & artisan tickets',
    status: 'PAGE',
    url: '/admin/tickets',
    keywords: ['maintenance', 'repair', 'ticket', 'plumbing', 'electrical', 'artisan', 'damage'],
  },
  {
    id: 'page-notices',
    type: 'COMMUNICATIONS',
    title: 'Platform Notices & Announcements',
    subtitle: 'Manage global marketplace announcements and policy notices',
    status: 'PAGE',
    url: '/admin/notices',
    keywords: ['notice', 'announcement', 'broadcast', 'banner', 'alert', 'policy'],
  },
  {
    id: 'page-notices-new',
    type: 'COMMUNICATIONS',
    title: 'Broadcast a New Notice',
    subtitle: 'Compose and publish a new platform announcement banner',
    status: 'PAGE',
    url: '/admin/notices/new',
    keywords: ['notice', 'announcement', 'create', 'new', 'post', 'broadcast'],
  },
  {
    id: 'page-broadcasts',
    type: 'COMMUNICATIONS',
    title: 'System Broadcasts & Live Alerts',
    subtitle: 'Instant push notifications to all tenants, landlords, or users',
    status: 'PAGE',
    url: '/admin/broadcasts',
    keywords: ['broadcast', 'socket', 'instant', 'alert', 'message', 'push'],
  },
  {
    id: 'page-config',
    type: 'GOVERNANCE',
    title: 'Platform Configuration & Settings',
    subtitle: 'Commission percentages, grace periods & platform parameters',
    status: 'PAGE',
    url: '/admin/config',
    keywords: ['settings', 'config', 'commission', 'grace', 'parameters', 'maintenance'],
  },
];

export default function AdminGlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const q = query.trim().toLowerCase();
    const matchedPages: SearchResult[] = STATIC_ADMIN_PAGES.filter((p) => {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchSubtitle = p.subtitle.toLowerCase().includes(q);
      const matchKeywords = p.keywords.some((k) => k.includes(q) || q.includes(k));
      return matchTitle || matchSubtitle || matchKeywords;
    }).map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      subtitle: p.subtitle,
      status: p.status,
      url: p.url,
    }));

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/search?q=${encodeURIComponent(query.trim())}`);
        const apiResults = res.data?.results || [];
        setResults([...matchedPages, ...apiResults]);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
        setResults(matchedPages);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    router.push(result.url);
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

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'LANDLORD':
      case 'TENANT':
      case 'ADMIN':
        return Users;
      case 'PROPERTY':
        return Building;
      case 'BOOKING':
        return CalendarCheck;
      case 'TRANSACTION':
        return CreditCard;
      case 'GOVERNANCE':
        return Power;
      case 'OPERATIONS':
        return Wrench;
      case 'COMMUNICATIONS':
        return Megaphone;
      default:
        return Search;
    }
  };

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 transition cursor-pointer"
        aria-label="Global platform search"
      >
        <Search className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">Search platform...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Input Bar */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search landlords, tenants, properties, bookings, transactions..."
                className="w-full bg-transparent text-sm font-medium text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none"
              />
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {results.length > 0 ? (
                results.map((result, idx) => {
                  const Icon = getEntityIcon(result.type);
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        'p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition',
                        isSelected
                          ? 'bg-[#0F5132]/10 dark:bg-emerald-950/40 text-zinc-950 dark:text-white'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={clsx(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                            isSelected
                              ? 'bg-[#0F5132] text-white border-transparent'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-2">
                            <span>{result.title}</span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                              ({result.type})
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <AdminStatusBadge status={result.status} size="sm" />
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    </div>
                  );
                })
              ) : query.length >= 2 && !isLoading ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No marketplace records found matching &quot;{query}&quot;.
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-400 space-y-1">
                  <p>Type at least 2 characters to search across all operational records.</p>
                  <p className="text-[10px] text-zinc-500">Use arrow keys ↑ ↓ to navigate and Enter to select.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Quick Navigation</span>
              <div className="flex items-center gap-3">
                <span>[ESC] to close</span>
                <span>[↵] to open</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
