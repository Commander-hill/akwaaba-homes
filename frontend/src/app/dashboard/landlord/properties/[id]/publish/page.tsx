'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { 
  ArrowLeft, CreditCard, CheckCircle2, ShieldCheck, 
  MapPin, Building, Calendar, Search, FileText, 
  Bell, ExternalLink, Loader2, Sparkles, Check, 
  Smartphone, AlertCircle, RefreshCw, Printer
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

export default function PublishPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const propertyId = params?.id as string;

  const [selectedProvider, setSelectedProvider] = useState<'HUBTEL' | 'PAYSTACK'>('HUBTEL');
  const [momoPhoneNumber, setMomoPhoneNumber] = useState('');
  const [phonePrefilled, setPhonePrefilled] = useState(false);
  const [waitingForMomo, setWaitingForMomo] = useState(false);

  // 1. Fetch Current Landlord Session
  const { data: session } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000
  });

  // Pre-fill phone number from session if available
  useEffect(() => {
    if (session?.phoneNumber && !phonePrefilled && !momoPhoneNumber) {
      setMomoPhoneNumber(session.phoneNumber);
      setPhonePrefilled(true);
    }
  }, [session, phonePrefilled, momoPhoneNumber]);

  // 2. Fetch Property Details (safely unwrap { property } from backend)
  const { data: rawPropertyData, isLoading: isLoadingProperty, refetch: refetchProperty } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data?.property || res.data?.data || res.data;
    },
    enabled: Boolean(propertyId)
  });

  const property = rawPropertyData?.property || rawPropertyData;

  // 3. Initialize Payment Mutation
  const initPaymentMutation = useMutation({
    mutationFn: async ({ provider, phoneNumber }: { provider: 'PAYSTACK' | 'HUBTEL'; phoneNumber?: string }) => {
      const { data } = await api.post('/subscriptions/initialize', {
        propertyId,
        provider,
        phoneNumber: phoneNumber?.trim() || undefined
      });
      return data?.data || data;
    },
    onSuccess: (data: any) => {
      const authUrl = data?.authorization_url || data?.data?.authorization_url;
      if (authUrl) {
        window.location.href = authUrl;
      } else if (selectedProvider === 'HUBTEL') {
        setWaitingForMomo(true);
        toast.success('Mobile Money prompt pushed to your phone. Please confirm the authorization.');
      }
    },
    onError: (error: any) => {
      setWaitingForMomo(false);
      toast.error(error.response?.data?.message || 'Failed to initiate payment. Please try again.');
    }
  });

  // 4. Verify Payment Mutation (for gateway return callbacks)
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ reference, provider }: { reference: string; provider?: string }) => {
      const { data } = await api.post('/subscriptions/verify', {
        paymentReference: reference,
        provider: provider || (reference.includes('HUBTEL') ? 'HUBTEL' : 'PAYSTACK')
      });
      return data?.data || data;
    },
    onSuccess: () => {
      toast.success('Listing successfully published and activated for 365 days!');
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'landlord', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      refetchProperty();
      // Remove query parameters from URL cleanly
      router.replace(`/dashboard/landlord/properties/${propertyId}/publish`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment verification failed. If your account was charged, our support team will reconcile it shortly.');
    }
  });

  // Handle gateway callback if query parameters present
  const verifiedRef = useRef(false);
  useEffect(() => {
    const verify = searchParams.get('verify');
    const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('clientReference');
    const provider = searchParams.get('provider') || undefined;

    if (verify === 'true' && reference && !verifiedRef.current && !verifyPaymentMutation.isPending) {
      verifiedRef.current = true;
      verifyPaymentMutation.mutate({ reference, provider });
    }
  }, [searchParams, verifyPaymentMutation]);

  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs text-zinc-500 font-medium">Loading property details...</p>
      </div>
    );
  }

  // Not found state
  if (!property) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Property Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          The requested listing could not be found or you do not have permission to publish it.
        </p>
        <Link
          href="/dashboard/landlord/properties"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to My Properties
        </Link>
      </div>
    );
  }

  const isAlreadyActive = property?.isAvailable && property?.subscription?.isActive;

  const parsedImages = React.useMemo(() => {
    if (!property?.images) return [];
    if (Array.isArray(property.images)) return property.images;
    if (typeof property.images === 'string') {
      try {
        const parsed = JSON.parse(property.images);
        return Array.isArray(parsed) ? parsed : [property.images];
      } catch {
        return [property.images];
      }
    }
    return [];
  }, [property?.images]);

  const coverImage = parsedImages.length > 0 ? getImageUrl(parsedImages[0]) : '';

  const totalRooms = React.useMemo(() => {
    if (!property?.rooms || !Array.isArray(property.rooms)) return 0;
    return property.rooms.reduce((acc: number, r: any) => acc + (Number(r.numberOfRooms) || 1), 0);
  }, [property?.rooms]);

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 space-y-8 animate-in fade-in duration-300">
      {/* ── Top Navigation & Breadcrumbs ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/landlord" className="hover:text-zinc-900 dark:hover:text-white transition">
            Landlord Hub
          </Link>
          <span>/</span>
          <Link href="/dashboard/landlord/properties" className="hover:text-zinc-900 dark:hover:text-white transition">
            My Properties
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[200px]">
            {property?.title || 'Listing'}
          </span>
          <span>/</span>
          <span className="text-[#0F5132] dark:text-emerald-400 font-bold">Publish Listing</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/landlord/properties"
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                title="Back to Properties"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                Publish Property Listing
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 pl-11">
              Publish your listing for 365 days of verified marketplace visibility, tenant inquiries, and automated bookings.
            </p>
          </div>

          {isAlreadyActive && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Currently Live &amp; Published
            </div>
          )}
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Column: Property Summary & License Benefits (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Target Listing Snapshot Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-3">
              Target Property Listing
            </span>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
              {/* Image Preview */}
              <div className="w-full sm:w-44 h-36 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative shrink-0 border border-zinc-200/80 dark:border-zinc-700/60">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                    <Building className="w-8 h-8 mb-1 opacity-50" />
                    <span className="text-[10px]">No Photo</span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide",
                    isAlreadyActive 
                      ? "bg-emerald-600 text-white shadow-xs" 
                      : "bg-amber-600 text-white shadow-xs"
                  )}>
                    {isAlreadyActive ? 'Live' : 'Unpublished'}
                  </span>
                </div>
              </div>

              {/* Property Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="text-lg font-black text-zinc-950 dark:text-white leading-snug truncate">
                  {property.title}
                </h3>

                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{property.location}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    <Building className="w-3 h-3 mr-1 text-zinc-400" />
                    {property.propertyType || 'Residential'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {totalRooms} {totalRooms === 1 ? 'Room Unit' : 'Room Units'}
                  </span>
                  {property.price && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-bold text-[#0F5132] dark:text-emerald-300">
                      GH₵ {property.price.toLocaleString()} / mo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Included Features & Annual Plan Benefits */}
          <div className="space-y-4 pt-1">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Everything Included with Your Listing
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Verified tools to showcase your property, attract quality tenants, and protect your rental income.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Feature 1 */}
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#12151D] flex items-start gap-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Campus &amp; Citywide Reach
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Prominently showcased to thousands of verified students across KNUST, Legon, and UCC, plus prime residential directories in Accra and Kumasi.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#12151D] flex items-start gap-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Verified Landlord Trust Badge
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Displays your official Ghana Card authenticity seal on every listing, establishing instant trust so tenants book with total confidence.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#12151D] flex items-start gap-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Protected Rent &amp; Escrow
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tenant security deposits and rent installments are safeguarded via secure Mobile Money escrow and disbursed reliably upon room handover.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#12151D] flex items-start gap-3.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Instant Digital Tenancy Leases
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Auto-generated, standardized tenancy agreements with enforceable digital signatures for hassle-free move-ins.
                  </p>
                </div>
              </div>
            </div>

            {/* Official Tax & Expense Notice */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 flex items-start sm:items-center gap-3">
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#0F5132] text-white font-extrabold text-[10px] tracking-wide uppercase">
                Tax Benefit
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                Listing fees qualify as 100% tax-deductible property management expenses under GRA guidelines. An official VAT invoice receipt is generated automatically for your records.
              </p>
            </div>
          </div>

        </div>

        {/* ── Right Column: Order Summary & Checkout (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Listing State Card */}
          {isAlreadyActive ? (
            <div className="bg-white dark:bg-[#12151D] border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">This Listing is Active</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Your property is live on the marketplace and receiving student bookings.
                </p>
              </div>

              {property.subscription?.endDate && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <span className="text-zinc-500 block text-[11px]">Subscription Expiry Date:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {new Date(property.subscription.endDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Link
                  href={`/properties/${property.id}`}
                  target="_blank"
                  className="w-full py-2.5 px-4 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" /> View Live Public Listing
                </Link>
                <Link
                  href="/dashboard/landlord/properties"
                  className="w-full py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition flex items-center justify-center"
                >
                  Return to Property Manager
                </Link>
              </div>
            </div>
          ) : (
            /* Checkout & Order Form */
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">Order Summary</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">365 Days Verified Listing Access</p>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>Annual Listing Subscription (365 Days)</span>
                  <span className="font-bold text-zinc-900 dark:text-white">GH₵ 100.00</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>Marketplace Processing Fee</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">GH₵ 0.00 (Waived)</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>VAT / Ghana Health Levy</span>
                  <span className="font-semibold text-zinc-500">Included</span>
                </div>

                <div className="pt-2 flex justify-between items-center text-sm font-black text-zinc-950 dark:text-white">
                  <span>Total Amount Due</span>
                  <span className="text-base text-[#0F5132] dark:text-emerald-400">GH₵ 100.00</span>
                </div>
              </div>

              {/* Payment Gateway Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Select Payment Method
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Hubtel Mobile Money */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider('HUBTEL');
                      setWaitingForMomo(false);
                    }}
                    className={clsx(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      selectedProvider === 'HUBTEL'
                        ? "border-[#0F5132] dark:border-emerald-500 bg-[#0F5132]/5 dark:bg-emerald-950/20 ring-2 ring-[#0F5132]/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#12151D]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white">Mobile Money</span>
                      <Smartphone className={clsx("w-4 h-4", selectedProvider === 'HUBTEL' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      MTN MoMo, Telecel Cash, AT Money (Instant Push Prompt)
                    </p>
                  </button>

                  {/* Paystack Cards */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider('PAYSTACK');
                      setWaitingForMomo(false);
                    }}
                    className={clsx(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      selectedProvider === 'PAYSTACK'
                        ? "border-[#0F5132] dark:border-emerald-500 bg-[#0F5132]/5 dark:bg-emerald-950/20 ring-2 ring-[#0F5132]/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#12151D]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white">Bank &amp; Card</span>
                      <CreditCard className={clsx("w-4 h-4", selectedProvider === 'PAYSTACK' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      Ghana Cards, Visa, Mastercard, Apple Pay, GHQR
                    </p>
                  </button>
                </div>
              </div>

              {/* Mobile Money Phone Input */}
              {selectedProvider === 'HUBTEL' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-900 dark:text-white">
                      Mobile Money Phone Number (Ghana)
                    </label>
                    <span className="text-[10px] text-zinc-400">MTN / Telecel / AT</span>
                  </div>

                  <div className="relative">
                    <input
                      type="tel"
                      value={momoPhoneNumber}
                      onChange={(e) => setMomoPhoneNumber(e.target.value)}
                      placeholder="e.g. 0244123456 or 0551234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0F5132] text-xs font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    An authorization payment prompt will be sent directly to this phone.
                  </p>
                </div>
              )}

              {/* Waiting for MoMo Push Prompt Notification */}
              {waitingForMomo && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    Authorization Prompt Pushed
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Please check your mobile phone and approve the USSD prompt for GH₵ 100.00. Once approved, this page will update automatically.
                  </p>
                </div>
              )}

              {/* Authorize & Pay Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    initPaymentMutation.mutate({
                      provider: selectedProvider,
                      phoneNumber: momoPhoneNumber || undefined
                    });
                  }}
                  disabled={initPaymentMutation.isPending || (selectedProvider === 'HUBTEL' && !momoPhoneNumber.trim())}
                  className="w-full py-3 px-4 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#0F5132]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {initPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing with {selectedProvider === 'HUBTEL' ? 'Hubtel MoMo' : 'Paystack'}...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Pay GH₵ 100.00</span>
                    </>
                  )}
                </button>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bank of Ghana licensed payment gateways with 256-bit encryption</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
