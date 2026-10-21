'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  RefreshCw, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Heart, 
  SlidersHorizontal,
  Home,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ThemeToggle';

export default function ButtonPreviewPage() {
  const [clickCount, setClickCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeSize, setActiveSize] = useState<'sm' | 'md' | 'lg'>('md');

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setClickCount((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 900);
  };

  const handleLoadMoreClick = () => {
    setIsLoadingMore(true);
    setClickCount((prev) => prev + 1);
    setTimeout(() => setIsLoadingMore(false), 900);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0B0E0C] text-zinc-950 dark:text-zinc-100 antialiased p-6 sm:p-10 lg:p-14 transition-colors">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
                  <Image src="/logo.png" alt="Akwaaba Homes" width={32} height={32} className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-black tracking-tight text-zinc-950 dark:text-white">
                  Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
                </span>
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                Design System Preview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              Platform Button Token Preview
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
              Previewing the requested squircle button geometry, border strokes, and bold typography across light and dark modes before site-wide rollout.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </div>

        {/* Section 1: Exact Reproduction of User's Uploaded Buttons */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0062BA] dark:text-blue-400">
                Direct 1:1 Recreation
              </span>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                Uploaded Reference Buttons in Context
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              Interactive Clicks: <strong className="text-zinc-900 dark:text-white font-mono">{clickCount}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: Light Background (media_1792623409597.png) */}
            <div className="p-8 rounded-2xl bg-[#EDF5FD] border border-blue-200/80 flex flex-col items-center justify-center space-y-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-blue-900 font-bold">
                Reference 1 (Light Canvas: &quot;See more matches&quot;)
              </span>
              <div className="py-4">
                <Button
                  variant="blue"
                  size="md"
                  isLoading={isLoadingMore}
                  onClick={handleLoadMoreClick}
                >
                  See more matches
                </Button>
              </div>
              <p className="text-[11px] text-blue-800/80 text-center max-w-xs">
                Rendered on ice-blue container with squircle corners, dark outer stroke, and pure white bold text.
              </p>
            </div>

            {/* Card B: Dark Background (media_1792623418450.png) */}
            <div className="p-8 rounded-2xl bg-[#1E2322] border border-zinc-800 flex flex-col items-center justify-center space-y-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Reference 2 (Dark Canvas: &quot;Refresh&quot;)
              </span>
              <div className="py-4">
                <Button
                  variant="blue"
                  size="md"
                  isLoading={isRefreshing}
                  onClick={handleRefreshClick}
                >
                  Refresh
                </Button>
              </div>
              <p className="text-[11px] text-zinc-400 text-center max-w-xs">
                Rendered on dark slate canvas. High contrast ensures 100% legibility in night mode.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Side-by-Side Brand Color Comparison */}
        <div className="space-y-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0F5132] dark:text-emerald-400">
              Color Hierarchy
            </span>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Color Variants in the Same Squircle Geometry
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Notice how the exact tactile feel carries over seamlessly whether using Royal Blue, Emerald, or Neutrals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Sapphire Blue */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121614] border border-zinc-200 dark:border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Royal Sapphire Blue</span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">DISCOVERY &amp; UTILITY</span>
              </div>
              <div className="py-2">
                <Button variant="blue" size={activeSize} className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Verified Homes
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Recommended for search, pagination (&quot;See more matches&quot;), filters, and refreshes.
              </p>
            </div>

            {/* Akwaaba Emerald */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121614] border border-zinc-200 dark:border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Akwaaba Forest Emerald</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">PRIMARY ACTIONS</span>
              </div>
              <div className="py-2">
                <Button variant="emerald" size={activeSize} className="w-full" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                  Reserve Property Now
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Recommended for bookings, sign-in, tenant verification, and escrow payments.
              </p>
            </div>

            {/* Secondary / Outline */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121614] border border-zinc-200 dark:border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Secondary Neutral</span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">SUPPORTING</span>
              </div>
              <div className="py-2">
                <Button variant="secondary" size={activeSize} className="w-full" leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
                  Filter Results
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Recommended for secondary controls, cancel actions, and filter toggles.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Interactive Size & State Playground */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#121614] border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Interactive Sizing &amp; Icon Playground
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select a size to see the scale adapt across both colors.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setActiveSize(sz)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeSize === sz
                      ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {sz.toUpperCase()} ({sz === 'sm' ? '36px' : sz === 'md' ? '44px' : '48px'})
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button variant="blue" size={activeSize} leftIcon={<Search className="w-4 h-4" />}>
              See more matches
            </Button>
            <Button variant="blue" size={activeSize} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Button variant="emerald" size={activeSize} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Sign In
            </Button>
            <Button variant="outline" size={activeSize}>
              Cancel
            </Button>
            <Button variant="danger" size={activeSize}>
              Reject Submission
            </Button>
          </div>
        </div>

        {/* Section 4: Implementation Roadmap */}
        <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Next Steps: Platform Rollout</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            The component is built and located at <code className="px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/40 font-mono text-[11px]">frontend/src/components/ui/Button.tsx</code>. Once you verify this preview at <code className="px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/40 font-mono text-[11px]">/button-preview</code>, we can apply it across:
          </p>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-5">
            <li>Search page &amp; property listings pagination (&quot;See more matches&quot; / &quot;Refresh listings&quot;)</li>
            <li>Authentication gateways (`/login`, `/register`, `/forgot-password`, `/reset-password`)</li>
            <li>Admin &amp; Landlord action bars (&quot;Approve&quot;, &quot;Request Resubmission&quot;, &quot;Add Property&quot;)</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
