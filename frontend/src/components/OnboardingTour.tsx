'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Compass, HelpCircle, Building, ShieldCheck, MapPin, Search } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  icon: React.ElementType;
  badge?: string;
}

interface OnboardingTourProps {
  role?: string;
}

export default function OnboardingTour({ role }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const isTenant = role === 'TENANT';

  const tenantSteps: TourStep[] = [
    {
      title: "Welcome to Akwaaba Homes! 🏠",
      description: "Your secure student housing & property rental platform in Ghana. Let's take a 30-second guided tour of your dashboard.",
      icon: Compass,
      badge: "Step 1 of 4"
    },
    {
      title: "Account Setup & Ghana Card Verification 🆔",
      description: "Complete your profile details and submit your Ghana Card to verify your identity and unlock 1-click room booking.",
      targetSelector: '#tour-progress-widget',
      icon: ShieldCheck,
      badge: "Step 2 of 4"
    },
    {
      title: "Browse Hostels & Location Filter 📍",
      description: "Click Properties in the navigation bar to search hostels near UCC, KNUST, or UG by price, room occupancy (1-4 in a room), and amenities.",
      targetSelector: '#tour-nav-properties',
      icon: Search,
      badge: "Step 3 of 4"
    },
    {
      title: "Dynamic Notice Board & Alerts 📢",
      description: "Stay updated with important student notices, room availability broadcasts, and booking status updates right at the top of your page.",
      targetSelector: '#tour-notice-board',
      icon: Sparkles,
      badge: "Step 4 of 4"
    }
  ];

  const landlordSteps: TourStep[] = [
    {
      title: "Welcome to your Landlord Hub! 💼",
      description: "Manage your hostel properties, track room capacities, view tenant booking applications, and monitor your earnings effortlessly.",
      icon: Compass,
      badge: "Step 1 of 4"
    },
    {
      title: "Account & Identity Verification 🛡️",
      description: "Keep your account setup at 100% by completing your profile and identity verification to build trust with student tenants.",
      targetSelector: '#tour-progress-widget',
      icon: ShieldCheck,
      badge: "Step 2 of 4"
    },
    {
      title: "List Property with Reverse Geocoding 📌",
      description: "Click List New Property to add a listing. Simply click on the interactive map to automatically pinpoint exact GPS coordinates and auto-fill area names!",
      targetSelector: '#tour-add-property',
      icon: MapPin,
      badge: "Step 3 of 4"
    },
    {
      title: "Subscriptions & Financial Reports 💳",
      description: "Manage property listing subscriptions, track active listing statuses, and view gross & net earnings in your CRM dashboard.",
      targetSelector: '#tour-landlord-tabs',
      icon: Building,
      badge: "Step 4 of 4"
    }
  ];

  const steps = isTenant ? tenantSteps : landlordSteps;
  const tourStorageKey = `akwaaba_tour_completed_${role || 'user'}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && role) {
      const isCompleted = localStorage.getItem(tourStorageKey);
      if (!isCompleted) {
        // Delay 1 second to let dashboard components mount cleanly
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [role, tourStorageKey]);

  useEffect(() => {
    if (isOpen && steps[currentStep]?.targetSelector) {
      const target = document.querySelector(steps[currentStep].targetSelector!);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('ring-4', 'ring-indigo-500/50', 'transition-all', 'duration-500');
        return () => {
          target.classList.remove('ring-4', 'ring-indigo-500/50');
        };
      }
    }
  }, [isOpen, currentStep, steps]);

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
    localStorage.setItem(tourStorageKey, 'true');
  };

  const handleReplay = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const current = steps[currentStep];
  const StepIcon = current?.icon || Compass;

  return (
    <>
      {/* Replay Tour Trigger Button (Pinned in header/dashboard) */}
      <button
        onClick={handleReplay}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm cursor-pointer"
        title="Replay Onboarding Tour"
      >
        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
        <span>Take Tour</span>
      </button>

      {/* Tour Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A1136] border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header Badge & Close */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {current.badge}
              </span>
              <button
                onClick={handleComplete}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                <StepIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-[var(--foreground)] leading-tight">
                  {current.title}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Progress Bar Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-7 bg-indigo-600 dark:bg-indigo-400'
                      : 'w-2 bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-3">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Skip Tour
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Got it, Finish!
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="w-3.5 h-3.5" />
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
