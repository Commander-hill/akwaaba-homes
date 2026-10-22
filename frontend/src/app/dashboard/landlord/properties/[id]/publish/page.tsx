'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { 
  ArrowLeft, CreditCard, CheckCircle2, MapPin, Building, Calendar, Search, FileText, 
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

  const { data: fee } = useQuery({
    queryKey: ['subscriptions', 'fee'],
    queryFn: async () => Number((await api.get('/subscriptions/fee')).data.feeGhs),
    staleTime: 10 * 60 * 1000,
  });

  const [selectedProvider, setSelectedProvider] = useState<'HUBTEL' | 'PAYSTACK'>('PAYSTACK');
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
      } else {
        toast.error('The payment provider did not return a checkout page. Please try again.');
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

  // Automated background polling while waiting for Hubtel Mobile Money authorization
  const isAlreadyActive = Boolean(property?.isAvailable && property?.subscription?.isActive);

  useEffect(() => {
    if (!waitingForMomo || isAlreadyActive) return;

    const interval = setInterval(async () => {
      const res = await refetchProperty();
      const updatedProp = res.data?.property || res.data?.data || res.data;
      if (updatedProp?.isAvailable && updatedProp?.subscription?.isActive) {
        setWaitingForMomo(false);
        toast.success('Payment verified! Your listing is now live.');
        queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'landlord', 'mine'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [waitingForMomo, isAlreadyActive, refetchProperty, queryClient, propertyId]);

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

  const feeLabel = fee !== undefined ? `GH₵ ${fee.toFixed(2)}` : '…';
  const periodLabel = property.pricePeriod ? `/ ${String(property.pricePeriod).toLowerCase()}` : '';

  const steps = [
    { label: '1. Listing', state: 'done' as const },
    { label: '2. Plan & Payment', state: isAlreadyActive ? ('done' as const) : ('current' as const) },
    { label: '3. Go Live', state: isAlreadyActive ? ('current' as const) : ('todo' as const) },
  ];

  const benefits = [
    { icon: Search, title: 'Marketplace visibility', body: 'Your approved listing appears in search results and on the public property page for the length of the subscription.' },
    { icon: CheckCircle2, title: 'Verified landlord badge', body: 'Once your identity and ownership documents are verified, a verification badge is shown on your listing.' },
    { icon: Bell, title: 'Booking requests', body: 'Receive booking requests and notifications, and approve or decline them from your Bookings page.' },
    { icon: FileText, title: 'Digital tenancy agreements', body: 'An agreement is generated when you approve a booking, and both parties sign it online.' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto pb-16 space-y-6 animate-in fade-in duration-300">
      {/* Header & stepper */}
      <div className="space-y-4">
        <Link
          href="/dashboard/landlord/properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Properties
        </Link>
        <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Publish Accommodation Listing</h1>

        <ol
          aria-label="Publishing progress"
          className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs"
        >
          {steps.map((s) => (
            <li
              key={s.label}
              aria-current={s.state === 'current' ? 'step' : undefined}
              className={clsx(
                'py-2 text-center font-bold rounded-lg truncate px-1',
                s.state === 'current'
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : s.state === 'done'
                    ? 'text-[#16A34A] dark:text-emerald-400'
                    : 'text-zinc-400 dark:text-zinc-500'
              )}
            >
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      {/* Step 1 card: target listing */}
      <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 1: Target Listing</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            The property this subscription will activate.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 items-start pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <div className="w-full sm:w-44 h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative shrink-0 mt-5">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt={property.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                <Building className="w-8 h-8 mb-1 opacity-50" />
                <span className="text-[10px]">No photo</span>
              </div>
            )}
            <span
              className={clsx(
                'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white',
                isAlreadyActive ? 'bg-emerald-600' : 'bg-amber-600'
              )}
            >
              {isAlreadyActive ? 'Live' : 'Unpublished'}
            </span>
          </div>
          <div className="flex-1 min-w-0 space-y-2 sm:mt-5">
            <h3 className="text-lg font-black text-zinc-950 dark:text-white leading-snug truncate">{property.title}</h3>
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5 mr-1 text-[#0F5132] dark:text-emerald-400 shrink-0" />
              <span className="truncate">{property.location}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {property.type || property.propertyType || 'Residential'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
              </span>
              {property.price ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-bold text-[#0F5132] dark:text-emerald-300">
                  From GH₵ {Number(property.price).toLocaleString()} {periodLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 / 3 card */}
      {isAlreadyActive ? (
        <section className="bg-white dark:bg-[#12151D] border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 3: Your listing is live</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Your property is visible to tenants and can receive booking requests.
            </p>
          </div>
          {property.subscription?.endDate && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="text-zinc-500 block text-[11px]">Subscription expires</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {new Date(property.subscription.endDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href="/dashboard/landlord/properties"
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              Back to Properties
            </Link>
            <Link
              href={`/properties/${property.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold"
            >
              <ExternalLink className="w-4 h-4" /> View public listing
            </Link>
          </div>
        </section>
      ) : (
        <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 2: Plan &amp; Payment</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Activate a 365-day subscription to make this approved listing visible to tenants.
            </p>
          </div>

          {property.approvalStatus && property.approvalStatus !== 'APPROVED' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This listing is {String(property.approvalStatus).toLowerCase()} by the review team. Paying now activates your
                subscription, but the listing becomes visible to tenants only after it is approved.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{b.title}</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-bold text-zinc-950 dark:text-white">Annual listing subscription</p>
              <p className="text-xs text-zinc-500">365 days, for this property only</p>
            </div>
            <p className="text-lg font-black text-[#0F5132] dark:text-emerald-400 tabular-nums">{feeLabel}</p>
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <span id="pay-method" className="text-xs font-bold text-zinc-900 dark:text-white block">
              Select payment method
            </span>
            <div role="radiogroup" aria-labelledby="pay-method" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'PAYSTACK' as const, name: 'Mobile Money or Card', desc: 'Pay with MTN, Telecel, AT mobile money or a card on the secure Paystack page', Icon: CreditCard },
                { key: 'HUBTEL' as const, name: 'Hubtel checkout', desc: 'Pay through the Hubtel hosted checkout page', Icon: Smartphone },
              ].map(({ key, name, desc, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selectedProvider === key}
                  onClick={() => {
                    setSelectedProvider(key);
                    setWaitingForMomo(false);
                  }}
                  className={clsx(
                    'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                    selectedProvider === key
                      ? 'border-[#16A34A] dark:border-emerald-500 bg-[#16A34A]/10 ring-2 ring-[#16A34A]/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-zinc-950 dark:text-white">{name}</span>
                    <Icon className={clsx('w-4 h-4', selectedProvider === key ? 'text-[#16A34A] dark:text-emerald-400' : 'text-zinc-400')} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-tight">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {selectedProvider === 'PAYSTACK'
              ? 'You will be taken to Paystack, where you can choose mobile money (MTN, Telecel or AT) or a card, depending on what is enabled for the account.'
              : 'You will be taken to the Hubtel checkout page to complete the payment.'}{' '}
            Your subscription is activated only after the provider confirms the payment to our servers.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              You will complete payment on the provider&apos;s secure page.
            </p>
            <button
              type="button"
              onClick={() => initPaymentMutation.mutate({ provider: selectedProvider })}
              disabled={initPaymentMutation.isPending || fee === undefined}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>Pay {feeLabel} &amp; Activate</>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
