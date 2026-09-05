'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Compass, HelpCircle, 
  Building, ShieldCheck, MapPin, Search, FileText, Scale 
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  icon: React.ElementType;
  badge: string;
  statutoryNote?: string;
}

interface OnboardingTourProps {
  role?: string;
  user?: any;
}

export default function OnboardingTour({ role, user }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'center' }>({ top: 0, left: 0, placement: 'center' });

  const isTenant = role === 'TENANT';

  const tenantSteps: TourStep[] = [
    {
      title: "Welcome to Akwaaba Homes 🇬🇭",
      description: "Ghana's trusted residential and commercial property tenancy platform. Explore certified accommodations, statutory Act 220 tenancy agreements, and bank-grade rent escrow protection.",
      icon: Compass,
      badge: "Step 1 of 4 • Institutional Network",
      statutoryNote: "Ghana Rent Act, 1963 (Act 220) Compliant"
    },
    {
      title: "Account Setup & Ghana Card (NIA) Verification 🆔",
      description: "Complete your resident profile and verify your National Identification Authority (NIA) Ghana Card to unlock verified tenancy applications, digital leases, and fast escrow clearance.",
      targetSelector: '#tour-progress-widget',
      icon: ShieldCheck,
      badge: "Step 2 of 4 • Identity Trust",
      statutoryNote: "NIA Identity Verification Standard"
    },
    {
      title: "Verified Property Discovery & Title Deeds 📍",
      description: "Browse verified residential apartments, family homes, and commercial spaces across Greater Accra, Ashanti, and Western regions with certified Lands Commission title deeds.",
      targetSelector: '#tour-nav-properties',
      icon: Search,
      badge: "Step 3 of 4 • Verified Listings",
      statutoryNote: "Lands Commission Audited Listings"
    },
    {
      title: "Tenancy Leases & Resident Workspaces 📜",
      description: "Access your 3 core resident workspaces to review legally binding tenancy agreements, track Mobile Money rent escrow deposits, and submit facility maintenance requests.",
      targetSelector: '#tour-tenant-workspaces',
      icon: FileText,
      badge: "Step 4 of 4 • Operations & Leases",
      statutoryNote: "SHA-256 Digital Tenancy Agreement"
    }
  ];

  const landlordSteps: TourStep[] = [
    {
      title: "Welcome to your Landlord Hub 💼",
      description: "Ghana's premier property asset governance platform. Seamlessly manage multi-unit properties, screen verified tenants, track advance rent escrow, and monitor institutional yields.",
      icon: Compass,
      badge: "Step 1 of 4 • Asset Governance",
      statutoryNote: "Ghana Real Estate Governance Standard"
    },
    {
      title: "Title Deed & Lands Commission Audit 🛡️",
      description: "Upload your property title deeds, indentures, and site plans for Lands Commission verification to earn the Verified Host badge and boost tenant booking confidence.",
      targetSelector: '#tour-progress-widget',
      icon: ShieldCheck,
      badge: "Step 2 of 4 • Title Verification",
      statutoryNote: "Lands Commission Certified Registry"
    },
    {
      title: "List Property with GPS Coordinates 📌",
      description: "Add residential and commercial properties with Ghana Post digital addresses, interactive GPS mapping, high-resolution media galleries, and custom unit inventories.",
      targetSelector: '#tour-add-property',
      icon: MapPin,
      badge: "Step 3 of 4 • Inventory Listing",
      statutoryNote: "Ghana Post GPS Digital Address System"
    },
    {
      title: "Operational Workspaces & MoMo Payouts 💳",
      description: "Access unified workflows for tenancy agreements, digital rent collection, instant Mobile Money withdrawals, GRA 5% tax withholding statements, and caretaker delegation.",
      targetSelector: '#tour-landlord-tabs',
      icon: Building,
      badge: "Step 4 of 4 • Yields & Compliance",
      statutoryNote: "GRA 5% Withholding Tax Compliant"
    }
  ];

  const steps = isTenant ? tenantSteps : landlordSteps;
  const tourStorageKey = user?.id ? `akwaaba_tour_completed_${user.id}` : `akwaaba_tour_completed_${role || 'user'}`;

  // Auto-start ONCE per user account only
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const isCompletedUser = localStorage.getItem(tourStorageKey);
      const isCompletedGlobal = localStorage.getItem('akwaaba_tour_completed_global');
      const isDismissed = localStorage.getItem(`akwaaba_tour_dismissed_${user.id}`);
      
      // If user has EVER completed or dismissed the tour, NEVER auto-open again
      if (isCompletedUser === 'true' || isCompletedGlobal === 'true' || isDismissed === 'true') {
        return;
      }

      // First time login popup timer
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user?.id, tourStorageKey]);

  // Recalculate target position & popover coordinates
  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    const currentSelector = steps[currentStep]?.targetSelector;
    if (!currentSelector) {
      setTargetRect(null);
      setPopoverPos({ top: 0, left: 0, placement: 'center' });
      return;
    }

    const el = document.querySelector(currentSelector);
    if (!el) {
      setTargetRect(null);
      setPopoverPos({ top: 0, left: 0, placement: 'center' });
      return;
    }

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    const cardWidth = Math.min(window.innerWidth - 32, 440);
    const cardHeight = 310;

    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));

    if (rect.bottom + cardHeight + 24 < window.innerHeight) {
      setPopoverPos({ top: rect.bottom + 16, left, placement: 'bottom' });
    } else if (rect.top - cardHeight - 24 > 0) {
      setPopoverPos({ top: rect.top - cardHeight - 16, left, placement: 'top' });
    } else {
      setPopoverPos({ top: 0, left: 0, placement: 'center' });
    }
  }, [isOpen, currentStep, steps]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, currentStep, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(tourStorageKey, 'true');
      localStorage.setItem('akwaaba_tour_completed_global', 'true');
      if (user?.id) {
        localStorage.setItem(`akwaaba_tour_dismissed_${user.id}`, 'true');
      }
    }
  };

  const handleReplay = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const current = steps[currentStep];
  const StepIcon = current?.icon || Compass;

  return (
    <>
      {/* Replay Tour Trigger Button */}
      <button
        onClick={handleReplay}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0F5132] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs cursor-pointer"
        title="Replay Onboarding Tour"
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
        <span>Platform Tour</span>
      </button>

      {/* Tour Overlay & Dynamic Positioning */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
          {/* Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300" 
            onClick={handleComplete} 
          />

          {/* Targeted Spotlight Ring around Component */}
          {targetRect && (
            <div
              className="fixed rounded-2xl border-4 border-[#0F5132] shadow-[0_0_40px_rgba(15,81,50,0.55)] pointer-events-none z-[52] transition-all duration-300 animate-pulse"
              style={{
                top: `${targetRect.top - 8}px`,
                left: `${targetRect.left - 8}px`,
                width: `${targetRect.width + 16}px`,
                height: `${targetRect.height + 16}px`,
              }}
            />
          )}

          {/* Tour Card Popover */}
          <div
            className={`bg-white dark:bg-[#0B0F19] border-2 border-[#0F5132]/60 dark:border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-[calc(100vw-32px)] sm:w-[440px] shadow-2xl z-[55] space-y-4 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
              popoverPos.placement === 'center'
                ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : 'fixed'
            }`}
            style={
              popoverPos.placement !== 'center'
                ? { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }
                : undefined
            }
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-[#0F5132]/25 via-[#D97706]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header Badge & Close */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                {current.badge}
              </span>
              <button
                onClick={handleComplete}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F5132] via-[#15803D] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
                <StepIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-snug">
                  {current.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Statutory Compliance Note */}
            {current.statutoryNote && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                <Scale className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
                <span>{current.statutoryNote}</span>
              </div>
            )}

            {/* Progress Bar Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-8 bg-[#0F5132] dark:bg-emerald-400'
                      : 'w-2 bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 gap-3">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Skip Tour
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-gradient-to-r from-[#0F5132] via-[#15803D] to-[#0A3D24] hover:from-[#0A3D24] hover:to-[#0F5132] text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-950/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Start Exploring
                  </>
                ) : (
                  <>
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
