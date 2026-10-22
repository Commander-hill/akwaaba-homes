'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  CheckCircle2,
  BedDouble,
  Users,
  Star,
  X,
  Lock,
  MessageSquare,
  Building2,
  Share2,
  Video,
  CalendarDays,
  Copy,
  Check,
  PenTool,
  AlertTriangle,
  GraduationCap,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Images,
  ArrowRight,
  Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
import WishlistButton from '@/components/WishlistButton';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import {
  Button,
  BreadcrumbNav,
  PriceDisplay,
  RatingSummary,
  VerificationIndicator,
  StatusBadge,
  EmptyState,
  formatCedis,
  getRentalPeriodLabel,
} from '@/components/tenant-ui/primitives';
import { formatPropertyTypeLabel, parseStringArray } from '@/components/tenant-ui/PropertyCard';

function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;

  // Room, Unit, Bed & Dates State
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedRoomUnitId, setSelectedRoomUnitId] = useState<string>('');
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Booking Flow State
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [showReservationSheet, setShowReservationSheet] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  // Gallery Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileGalleryIdx, setMobileGalleryIdx] = useState(0);

  // Physical Viewing Modal State
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('Morning (9:00 AM - 12:00 PM)');
  const [viewingPhone, setViewingPhone] = useState('');
  const [viewingNotes, setViewingNotes] = useState('');
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingScheduled, setViewingScheduled] = useState<{ date: string; time: string } | null>(
    null
  );

  // Share State
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    retry: false,
  });

  const {
    data: property,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data.property;
    },
    retry: 1,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', propertyId],
    queryFn: async () => {
      const res = await api.get(`/reviews/property/${propertyId}`);
      return res.data;
    },
  });

  const { data: myActiveBookingData } = useQuery({
    queryKey: ['bookings', 'my-active'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/my-active');
      return data.booking;
    },
    enabled: !!session && session.role === 'TENANT',
    retry: false,
  });

  const isStaffOrLandlord = Boolean(
    session &&
      (session.role === 'CARETAKER' ||
        session.role === 'STAFF' ||
        session.role === 'LANDLORD' ||
        session.role === 'ADMIN')
  );

  useEffect(() => {
    if (session && (session.role === 'CARETAKER' || session.role === 'STAFF')) {
      router.replace('/dashboard/caretaker');
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.phoneNumber && !viewingPhone) {
      setViewingPhone(session.phoneNumber);
    }
  }, [session, viewingPhone]);

  const currentRoom =
    property?.rooms?.find((r: any) => r.id === selectedRoomId) || property?.rooms?.[0];

  const isStudentRestricted = Boolean(
    property?.type?.toUpperCase() === 'HOSTEL' || property?.targetAudience === 'Students Only'
  );
  const isVerifiedStudent = Boolean(
    session?.studentId &&
      session.studentId.trim().length > 0 &&
      session?.campus &&
      session.campus.trim().length > 0
  );

  useEffect(() => {
    if (property?.rooms && property.rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(property.rooms[0].id);
    }
  }, [property, selectedRoomId]);

  // Pre-select first available unit & bed when room changes
  useEffect(() => {
    if (!currentRoom || !currentRoom.roomUnits || currentRoom.roomUnits.length === 0) {
      setSelectedRoomUnitId('');
      setSelectedBedId('');
      return;
    }

    let targetUnit = currentRoom.roomUnits.find((u: any) => u.id === selectedRoomUnitId);

    if (!targetUnit || !targetUnit.beds?.some((b: any) => b.status === 'AVAILABLE')) {
      targetUnit = currentRoom.roomUnits.find(
        (u: any) => u.beds && u.beds.some((b: any) => b.status === 'AVAILABLE')
      );
      if (targetUnit) {
        setSelectedRoomUnitId(targetUnit.id);
      } else {
        setSelectedRoomUnitId(currentRoom.roomUnits[0]?.id || '');
      }
    }

    if (targetUnit?.beds && targetUnit.beds.length > 0) {
      const isCurrentBedValid = targetUnit.beds.some(
        (b: any) => b.id === selectedBedId && b.status === 'AVAILABLE'
      );
      if (!isCurrentBedValid) {
        const firstAvailableBed = targetUnit.beds.find((b: any) => b.status === 'AVAILABLE');
        setSelectedBedId(firstAvailableBed ? firstAvailableBed.id : '');
      }
    } else {
      setSelectedBedId('');
    }
  }, [currentRoom, selectedRoomUnitId, selectedBedId]);

  const handleStartChat = async () => {
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(`/properties/${propertyId}`)}`);
      return;
    }
    const landlordId = property?.landlordId || property?.landlord?.id;
    if (!landlordId) {
      toast.error('Landlord contact information not available.');
      return;
    }

    try {
      await api.post('/chat/conversations', { partnerId: landlordId });
      router.push('/dashboard/messages');
    } catch {
      router.push('/dashboard/messages');
    }
  };

  const handleScheduleViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(`/properties/${propertyId}`)}`);
      return;
    }
    if (!viewingDate) {
      toast.error('Please pick an inspection date.');
      return;
    }

    setViewingSubmitting(true);
    const landlordId = property?.landlordId || property?.landlord?.id;

    try {
      const viewingNotice = `PHYSICAL VIEWING REQUEST: I would like to schedule an on-site inspection of ${property.title} (${property.location}) on ${viewingDate} during ${viewingTime}. Contact Phone: ${viewingPhone || session.phoneNumber || 'N/A'}.${viewingNotes ? ` Notes: ${viewingNotes}` : ''}`;

      if (landlordId) {
        const { data } = await api.post('/chat/conversations', { partnerId: landlordId });
        if (data?.id) {
          await api.post(`/chat/${data.id}/messages`, { content: viewingNotice });
        }
      }

      setViewingScheduled({ date: viewingDate, time: viewingTime });
      setShowViewingModal(false);
      toast.success('Inspection request sent to the landlord.');
    } catch {
      setViewingScheduled({ date: viewingDate, time: viewingTime });
      setShowViewingModal(false);
      toast.success('Inspection request recorded.');
    } finally {
      setViewingSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Property link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined' && property) {
      const shareUrl = window.location.href;
      const text = `${property.title} in ${property.location} (${formatCedis(property.price)} ${getRentalPeriodLabel(property.type, property.pricePeriod, true)}) on Akwaaba Homes: ${shareUrl}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleInitiateBookingReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(`/properties/${propertyId}`)}`);
      return;
    }

    if (session.role !== 'TENANT' && session.role !== 'ADMIN') {
      setBookingMessage({
        text: 'Reservations are available exclusively for Resident / Tenant accounts.',
        type: 'error',
      });
      return;
    }

    if (isStudentRestricted && !isVerifiedStudent) {
      setBookingMessage({
        text: 'This hostel requires verified tertiary student credentials (Campus & Student ID). Please update your profile first.',
        type: 'error',
      });
      return;
    }

    if (currentRoom && currentRoom.roomUnits && currentRoom.roomUnits.length > 0) {
      if (!selectedRoomUnitId || !selectedBedId) {
        setBookingMessage({
          text: 'Please select an available unit and bed space before continuing.',
          type: 'error',
        });
        return;
      }
    }

    setBookingMessage(null);
    setAgreedToTerms(false);
    setCreatedBookingId(null);
    setShowReservationSheet(true);
  };

  const handleConfirmBookingSubmission = async () => {
    if (!agreedToTerms) {
      toast.error('Please confirm the rental terms and house rules before submitting.');
      return;
    }
    setIsBooking(true);
    setBookingMessage(null);
    try {
      const payload = {
        propertyId,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate
          ? new Date(endDate).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        roomId: selectedRoomId || null,
        roomUnitId: selectedRoomUnitId || null,
        bedId: selectedBedId || null,
      };

      const { data } = await api.post('/bookings', payload);

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }

      const newId = data?.booking?.id || data?.id || null;
      setCreatedBookingId(newId);
      setBookingMessage({
        text: 'Your booking request has been submitted to the host.',
        type: 'success',
      });
      toast.success('Reservation submitted.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Unable to submit booking request.';
      setBookingMessage({ text: errorMsg, type: 'error' });
      setShowReservationSheet(false);
      if (error.response?.data?.redirectTo) {
        setTimeout(() => {
          router.push(error.response.data.redirectTo);
        }, 2000);
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F2] dark:bg-[#0D100E] py-10">
        <div className="container-akwaaba space-y-6 animate-pulse">
          <div className="h-5 w-48 bg-[#E7E7DF] dark:bg-[#262E2A] rounded" />
          <div className="h-10 w-2/3 bg-[#E7E7DF] dark:bg-[#262E2A] rounded" />
          <div className="h-[380px] w-full bg-[#E7E7DF] dark:bg-[#262E2A] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#0D100E]">
        <div className="container-akwaaba py-16">
          <EmptyState
            icon={Building2}
            title="Property Not Available"
            description="This accommodation listing could not be found or is no longer published. Explore other available properties across Ghana."
            actionLabel="Browse accommodations"
            actionHref="/search"
          />
        </div>
        <PublicFooter />
      </div>
    );
  }

  const parsedImages = parseStringArray(property.images).filter(
    (img) => img.length > 5 && !img.includes('undefined') && !img.includes('null')
  );
  const galleryImages =
    parsedImages.length > 0
      ? parsedImages.map((img) => getImageUrl(img))
      : [
          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        ];

  const parsedAmenities = parseStringArray(property.amenities);
  const parsedUtilities = parseStringArray(property.includedUtilities);

  const selectedRoom = property.rooms?.find((r: any) => r.id === selectedRoomId);
  const displayPrice = selectedRoom ? Number(selectedRoom.price) : Number(property.price || 0);
  const cautionDepositAmt = property.cautionDeposit ? Number(property.cautionDeposit) : 0;
  const isHostel = (property.type || '').toUpperCase() === 'HOSTEL';
  const landlordName = property.landlord
    ? `${property.landlord.firstName || ''} ${property.landlord.lastName || ''}`.trim()
    : 'Property Host';

  const selectedUnitObj = currentRoom?.roomUnits?.find((u: any) => u.id === selectedRoomUnitId);
  const selectedBedObj = selectedUnitObj?.beds?.find((b: any) => b.id === selectedBedId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      <div className="container-akwaaba py-6 sm:py-8 space-y-8 flex-1 pb-24 lg:pb-16">
        {/* ── 1. BREADCRUMB & ACTIONS HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <BreadcrumbNav
            items={[
              { label: 'Home', href: '/' },
              { label: 'Accommodations', href: '/search' },
              { label: property.location, href: `/search?location=${encodeURIComponent(property.location)}` },
              { label: property.title },
            ]}
          />

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="h-9 px-3 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] hover:border-[#16A34A] text-xs font-semibold text-[#242925] dark:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#557A67]" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] hover:border-[#16A34A] text-xs font-semibold text-[#242925] dark:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#165B36]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#557A67]" />
              )}
              <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
            </button>

            <WishlistButton propertyId={property.id} showText={true} />
          </div>
        </div>

        {/* ── 2. TITLE, LOCATION & VERIFIED RATING SUMMARY ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold text-[#242925] dark:text-white">
              {formatPropertyTypeLabel(property.type)}
            </span>
            <VerificationIndicator
              isVerifiedLandlord={property.landlord?.isVerifiedLandlord}
              showUnverified={true}
            />
            <span className="text-[#E7E7DF] dark:text-[#262E2A]">•</span>
            <RatingSummary
              avgRating={reviewsData?.avgRating ?? property.avgRating}
              reviewCount={reviewsData?.reviews?.length ?? property.reviewCount}
            />
          </div>

          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-[#242925] dark:text-white tracking-tight">
            {property.title}
          </h1>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F]">
            <MapPin className="w-4 h-4 text-[#557A67] shrink-0" />
            <span>{property.location}</span>
          </div>
        </div>

        {/* ── 3. ADAPTIVE PHOTO GALLERY (Desktop Grid + Mobile Carousel + Lightbox) ── */}
        <div className="relative rounded-xl overflow-hidden border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816]">
          {/* Mobile Carousel */}
          <div className="md:hidden relative aspect-[4/3] w-full bg-[#F1EFE8]">
            <img
              src={galleryImages[mobileGalleryIdx] || galleryImages[0]}
              alt={`${property.title} — photo ${mobileGalleryIdx + 1}`}
              onClick={() => setLightboxIndex(mobileGalleryIdx)}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
              }}
              className="w-full h-full object-cover cursor-pointer"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setMobileGalleryIdx((prev) =>
                      prev === 0 ? galleryImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#242925] flex items-center justify-center shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() =>
                    setMobileGalleryIdx((prev) =>
                      prev === galleryImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#242925] flex items-center justify-center shadow-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-medium">
                  {mobileGalleryIdx + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>

          {/* Desktop Gallery Composition */}
          <div className="hidden md:block">
            {galleryImages.length === 1 ? (
              <div
                onClick={() => setLightboxIndex(0)}
                className="h-[440px] w-full overflow-hidden cursor-pointer"
              >
                <img
                  src={galleryImages[0]}
                  alt={property.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
                  }}
                  className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
                />
              </div>
            ) : galleryImages.length === 2 ? (
              <div className="grid grid-cols-2 gap-1.5 h-[440px]">
                {galleryImages.slice(0, 2).map((src, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="h-full overflow-hidden cursor-pointer"
                  >
                    <img
                      src={src}
                      alt={`${property.title} — photo ${idx + 1}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 h-[440px]">
                <div
                  onClick={() => setLightboxIndex(0)}
                  className="col-span-2 h-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={galleryImages[0]}
                    alt={`${property.title} — primary view`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
                    }}
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5 h-full">
                  <div
                    onClick={() => setLightboxIndex(1)}
                    className="flex-1 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={galleryImages[1]}
                      alt={`${property.title} — interior view`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <div
                    onClick={() => setLightboxIndex(2)}
                    className="flex-1 overflow-hidden relative cursor-pointer"
                  >
                    <img
                      src={galleryImages[2]}
                      alt={`${property.title} — additional view`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                    {galleryImages.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/30">
                          <Images className="w-4 h-4" />
                          View all {galleryImages.length} photos
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. TWO-COLUMN DETAILS & BOOKING LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT COLUMN: Property Information (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            {/* Essential Facts Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block">
                  Accommodation Type
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white mt-0.5 block">
                  {formatPropertyTypeLabel(property.type)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block">
                  Intended Residents
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white mt-0.5 block">
                  {property.targetAudience || 'Students & Residents'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block">
                  Furnishing
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white mt-0.5 block">
                  {property.furnishing || 'Standard'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block">
                  Availability
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#165B36] dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isHostel && property.remainingCapacity !== undefined
                      ? `${property.remainingCapacity} spaces open`
                      : property.isAvailable === false
                      ? 'Fully Booked'
                      : 'Available'}
                  </span>
                </span>
              </div>
            </div>

            {/* Property Description */}
            <section className="space-y-3">
              <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                About this accommodation
              </h2>
              <p className="text-sm sm:text-base text-[#5E645E] dark:text-[#9EA69F] leading-relaxed whitespace-pre-wrap">
                {cleanText(property.description) ||
                  'Residential accommodation offering clear tenancy terms, essential utilities, and direct management.'}
              </p>
            </section>

            {/* 9.3 Available Rooms and Units Section */}
            {property.rooms && property.rooms.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                <div>
                  <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                    Available rooms &amp; unit options
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F] mt-1">
                    Select a room option below to update the reservation panel and view specific unit availability.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.rooms.map((room: any) => {
                    const isSoldOut =
                      room.isSoldOut ||
                      (room.remainingCapacity !== undefined && room.remainingCapacity <= 0);
                    const isSelected = selectedRoomId === room.id;

                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setBookingMessage(null);
                        }}
                        className={clsx(
                          'p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer',
                          isSelected
                            ? 'bg-[#EDF6F0]/70 dark:bg-emerald-950/30 border-[#173D32] ring-1 ring-[#173D32]'
                            : isSoldOut
                            ? 'bg-white/60 dark:bg-[#141816]/50 border-[#E7E7DF] dark:border-[#262E2A] opacity-65'
                            : 'bg-white dark:bg-[#141816] border-[#E7E7DF] dark:border-[#262E2A] hover:border-[#557A67]'
                        )}
                      >
                        <div className="space-y-1.5 w-full">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-[#242925] dark:text-white">
                              {room.blockName ? `${room.blockName} — ` : ''}
                              {room.roomType || room.name || 'Standard Unit'}
                            </h3>
                            <StatusBadge
                              status={isSoldOut ? 'FULL' : 'AVAILABLE'}
                              customLabel={
                                isSoldOut
                                  ? 'Full'
                                  : room.remainingCapacity !== undefined
                                  ? `${room.remainingCapacity} open`
                                  : 'Available'
                              }
                              size="xs"
                            />
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#6F756F]">
                            {room.capacity && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-[#557A67]" />
                                Capacity: {room.capacity}
                              </span>
                            )}
                            {room.roomUnits?.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <BedDouble className="w-3.5 h-3.5 text-[#557A67]" />
                                {room.roomUnits.length} {room.roomUnits.length === 1 ? 'unit' : 'units'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-[#E7E7DF] dark:border-[#262E2A] w-full flex items-center justify-between">
                          <PriceDisplay
                            amount={room.price}
                            propertyType={property.type}
                            billingCycle={property.pricePeriod}
                            size="sm"
                          />
                          <span className="text-xs font-semibold text-[#173D32] dark:text-emerald-400">
                            {isSelected ? 'Selected ✓' : 'Select unit'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Video Tour (if present) */}
            {property.videoUrl && (
              <section className="space-y-3 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#173D32]" />
                  <span>Property video walkthrough</span>
                </h2>
                <div className="rounded-xl overflow-hidden border border-[#E7E7DF] dark:border-[#262E2A] bg-black aspect-video">
                  <video
                    src={property.videoUrl}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>
              </section>
            )}

            {/* Amenities & Facilities */}
            {parsedAmenities.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                  Amenities &amp; facilities
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {parsedAmenities.map((amenity: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-xs sm:text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#173D32] dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-[#242925] dark:text-white truncate">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* House Rules & Terms */}
            <section className="space-y-4 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
              <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                House rules &amp; rental terms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block mb-1">
                    Gate Access
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white">
                    {cleanText(property.gateLockTime) || '24/7 Access'}
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block mb-1">
                    Visitor Policy
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white">
                    {cleanText(property.visitorPolicy) || 'Standard daytime visitors permitted'}
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block mb-1">
                    Quiet Hours
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#242925] dark:text-white">
                    {cleanText(property.quietHours) || 'From 10:00 PM'}
                  </span>
                </div>
              </div>
            </section>

            {/* 9.4 Host Information & Verification */}
            <section className="pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
              <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#173D32] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {property.landlord?.firstName?.[0] || 'H'}
                    {property.landlord?.lastName?.[0] || ''}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-[#242925] dark:text-white">
                        Hosted by {landlordName}
                      </h3>
                      <VerificationIndicator
                        isVerifiedLandlord={property.landlord?.isVerifiedLandlord}
                        showUnverified={true}
                      />
                    </div>
                    <p className="text-xs text-[#6F756F] dark:text-[#9EA69F]">
                      {property.landlord?.isVerifiedLandlord
                        ? 'Identity and ownership documentation verified by Akwaaba Homes.'
                        : 'Registered host account on Akwaaba Homes.'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartChat}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5 text-[#16A34A]" />}
                >
                  Message Host
                </Button>
              </div>
            </section>

            {/* Location Map (Only when reliable coordinates exist) */}
            {property.latitude && property.longitude && (
              <section className="space-y-3 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                <div className="flex items-center justify-between">
                  <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                    Location &amp; neighborhood
                  </h2>
                  <span className="text-xs text-[#6F756F] font-medium">{property.location}</span>
                </div>
                <div className="h-72 rounded-xl overflow-hidden border border-[#E7E7DF] dark:border-[#262E2A] relative z-0">
                  <Map mode="view" property={property} />
                </div>
              </section>
            )}

            {/* Verified Resident Reviews */}
            <section className="space-y-5 pt-6 border-t border-[#E7E7DF] dark:border-[#262E2A]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
                    Resident reviews
                  </h2>
                  <p className="text-xs text-[#6F756F] mt-0.5">
                    Reviews are submitted by tenants with confirmed bookings at this property.
                  </p>
                </div>
                <RatingSummary
                  avgRating={reviewsData?.avgRating ?? property.avgRating}
                  reviewCount={reviewsData?.reviews?.length ?? property.reviewCount}
                />
              </div>

              {reviewsData?.reviews?.length > 0 && reviewsData?.ratingDistribution && (
                <div className="p-4 rounded-xl bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewsData.ratingDistribution[star] || 0;
                    const total = reviewsData.reviews.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-10 font-medium text-[#6F756F]">{star} star</span>
                        <div className="flex-1 h-2 rounded-full bg-[#F1EFE8] dark:bg-[#1B211E] overflow-hidden">
                          <div
                            className="h-full bg-[#C77B59] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] text-[#6F756F]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {!reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-center text-xs sm:text-sm text-[#6F756F]">
                  No resident reviews have been submitted for this property yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData.reviews.map((r: any) => (
                    <article
                      key={r.id}
                      className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] space-y-2 text-xs sm:text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#242925] dark:text-white">
                            {r.authorName ||
                              (r.author?.firstName
                                ? `${r.author.firstName} ${r.author.lastName || ''}`.trim()
                                : 'Verified Resident')}
                          </span>
                          {r.createdAt && (
                            <span className="text-xs text-[#6F756F] ml-2">
                              •{' '}
                              {new Date(r.createdAt).toLocaleDateString('en-GH', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[#C77B59] font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-[#C77B59]" />
                            <span>{r.rating}.0</span>
                          </div>
                          {session?.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.post(`/reviews/${r.id}/flag`, {
                                    reason: 'Reported from property page',
                                  });
                                  toast.success('Review reported for moderation.');
                                } catch {
                                  toast.error('Could not report review at this time.');
                                }
                              }}
                              className="text-[11px] text-[#6F756F] hover:text-[#9E2A2B] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[#5E645E] dark:text-[#9EA69F] leading-relaxed">
                        {cleanText(r.comment)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN: 9.5 BOOKING PANEL (5 cols) ── */}
          <div id="booking-widget" className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-22">
            <div className="bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A] p-5 sm:p-6 shadow-[0_8px_24px_-6px_rgba(23,61,50,0.06)] space-y-5">
              {/* Price & Escrow Header */}
              <div className="flex items-baseline justify-between pb-4 border-b border-[#E7E7DF] dark:border-[#262E2A]">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] block mb-0.5">
                    {selectedRoom ? selectedRoom.roomType || 'Selected Unit' : 'Rental Rate'}
                  </span>
                  <PriceDisplay
                    amount={displayPrice}
                    propertyType={property.type}
                    billingCycle={property.pricePeriod}
                    size="lg"
                  />
                </div>
                <StatusBadge status="PAID_IN_ESCROW" customLabel="Protected Booking" size="xs" />
              </div>

              {viewingScheduled && (
                <div className="p-3.5 rounded-lg bg-[#EDF6F0] border border-[#C5E2D0] text-xs space-y-1">
                  <div className="font-bold text-[#165B36] flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    <span>Inspection Requested</span>
                  </div>
                  <p className="text-[#242925]">
                    Scheduled for <strong>{viewingScheduled.date}</strong> ({viewingScheduled.time}).
                  </p>
                </div>
              )}

              {/* Active Booking State for this property */}
              {myActiveBookingData && myActiveBookingData.propertyId === propertyId ? (
                <div className="p-4 rounded-xl bg-[#EDF6F0]/60 dark:bg-emerald-950/30 border border-[#C5E2D0] dark:border-emerald-800/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#165B36] dark:text-emerald-300">
                      Your Active Booking
                    </span>
                    <StatusBadge status={myActiveBookingData.status} size="xs" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-[#242925] dark:text-white">
                      {myActiveBookingData.room?.roomType || property.title}
                    </p>
                    <p className="text-[#6F756F]">
                      {new Date(myActiveBookingData.startDate).toLocaleDateString('en-GH')} &ndash;{' '}
                      {new Date(myActiveBookingData.endDate).toLocaleDateString('en-GH')}
                    </p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <Link
                      href={`/bookings/${myActiveBookingData.id}`}
                      className="w-full h-10 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                    >
                      <span>View Booking Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/support"
                      className="w-full h-9 bg-white dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-[#242925] dark:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5 text-[#557A67]" />
                      <span>Report an Issue</span>
                    </Link>
                  </div>
                </div>
              ) : isStaffOrLandlord ? (
                <div className="p-4 rounded-xl bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] space-y-3 text-xs">
                  <div className="font-bold text-[#242925] dark:text-white">
                    {session?.role === 'LANDLORD' ? 'Landlord Preview Mode' : 'Operations Preview Mode'}
                  </div>
                  <p className="text-[#6F756F] leading-relaxed">
                    You are signed in with a non-tenant account. Switch to a resident account to submit a reservation.
                  </p>
                  <Link
                    href={
                      session?.role === 'LANDLORD'
                        ? '/dashboard/landlord/properties'
                        : '/dashboard/caretaker'
                    }
                    className="w-full h-10 bg-[#173D32] text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                  >
                    {session?.role === 'LANDLORD'
                      ? 'Return to Landlord Hub'
                      : 'Return to Caretaker Hub'}
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleInitiateBookingReview} className="space-y-4 text-xs">
                  {myActiveBookingData && myActiveBookingData.propertyId !== propertyId && (
                    <div className="p-3.5 rounded-lg bg-[#FDF5E8] border border-[#F2D8B3] text-[#8C4F0F] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Existing Booking on Record</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        You already have an active booking at{' '}
                        <strong>{myActiveBookingData.property?.title}</strong>.
                      </p>
                      <Link
                        href={`/bookings/${myActiveBookingData.id}`}
                        className="inline-block font-semibold underline text-[11px]"
                      >
                        Manage existing booking &rarr;
                      </Link>
                    </div>
                  )}

                  {bookingMessage && (
                    <div
                      role="alert"
                      className={clsx(
                        'p-3.5 rounded-lg text-xs font-medium border',
                        bookingMessage.type === 'success'
                          ? 'bg-[#EDF6F0] text-[#165B36] border-[#C5E2D0]'
                          : 'bg-[#FCEEEE] text-[#9E2A2B] border-[#F3C5C5]'
                      )}
                    >
                      <p>{bookingMessage.text}</p>
                      {createdBookingId && (
                        <Link
                          href={`/bookings/${createdBookingId}`}
                          className="mt-2 inline-flex items-center gap-1 font-bold underline"
                        >
                          <span>Open booking details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Student Restriction Notice */}
                  {isStudentRestricted && (
                    <div
                      className={clsx(
                        'p-3.5 rounded-lg border space-y-1',
                        isVerifiedStudent
                          ? 'bg-[#EDF6F0] border-[#C5E2D0] text-[#165B36]'
                          : 'bg-[#FDF5E8] border-[#F2D8B3] text-[#8C4F0F]'
                      )}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        <span>
                          {isVerifiedStudent
                            ? `Student Verified (${session?.campus})`
                            : 'Student Hostel — Verification Required'}
                        </span>
                      </div>
                      {!isVerifiedStudent && (
                        <p className="text-[11px] leading-relaxed">
                          Please complete your Campus and Student ID details in your{' '}
                          <Link href="/profile" className="underline font-bold">
                            Profile
                          </Link>{' '}
                          to reserve this student accommodation.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Room Selector */}
                  {property.rooms && property.rooms.length > 0 && (
                    <div>
                      <label
                        htmlFor="booking-room-select"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] mb-1.5"
                      >
                        Room / Unit Type
                      </label>
                      <select
                        id="booking-room-select"
                        value={selectedRoomId}
                        onChange={(e) => {
                          setSelectedRoomId(e.target.value);
                          setBookingMessage(null);
                        }}
                        className="w-full h-10 px-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
                      >
                        {property.rooms.map((room: any) => {
                          const soldOut =
                            room.isSoldOut ||
                            (room.remainingCapacity !== undefined && room.remainingCapacity <= 0);
                          return (
                            <option key={room.id} value={room.id} disabled={soldOut}>
                              {room.blockName ? `${room.blockName} - ` : ''}
                              {room.roomType} — {formatCedis(room.price)}
                              {soldOut ? ' (Full)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Unit & Bed Selection */}
                  {currentRoom && currentRoom.roomUnits && currentRoom.roomUnits.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] space-y-3">
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] mb-1.5">
                          Select Unit ({currentRoom.roomUnits.length} total)
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {currentRoom.roomUnits.map((unit: any) => {
                            const availBeds =
                              unit.availableBedsCount !== undefined
                                ? unit.availableBedsCount
                                : unit.beds?.filter((b: any) => b.status === 'AVAILABLE').length || 0;
                            const isAvail = availBeds > 0 && !unit.isOccupied;
                            const isSelected = selectedRoomUnitId === unit.id;

                            return (
                              <button
                                key={unit.id}
                                type="button"
                                disabled={!isAvail}
                                onClick={() => {
                                  setSelectedRoomUnitId(unit.id);
                                  const firstAvail = unit.beds?.find(
                                    (b: any) => b.status === 'AVAILABLE'
                                  );
                                  setSelectedBedId(firstAvail ? firstAvail.id : '');
                                }}
                                className={clsx(
                                  'p-2 rounded-md border text-left transition-all text-xs',
                                  isSelected && isAvail
                                    ? 'bg-[#173D32] text-white border-[#173D32] font-semibold'
                                    : isAvail
                                    ? 'bg-white dark:bg-[#141816] border-[#E7E7DF] dark:border-[#262E2A] text-[#242925] dark:text-white cursor-pointer'
                                    : 'bg-[#F1EFE8] text-[#6F756F] border-[#E7E7DF] opacity-50 cursor-not-allowed'
                                )}
                              >
                                <div className="font-bold">{unit.unitNumber}</div>
                                <div
                                  className={clsx(
                                    'text-[10px]',
                                    isSelected && isAvail ? 'text-white/80' : 'text-[#6F756F]'
                                  )}
                                >
                                  {isAvail ? `${availBeds} open` : 'Occupied'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedUnitObj?.beds && selectedUnitObj.beds.length > 1 && (
                        <div className="pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] mb-1.5">
                            Select Bed Space
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {selectedUnitObj.beds.map((bed: any) => {
                              const isAvail = bed.status === 'AVAILABLE';
                              const isBedSelected = selectedBedId === bed.id;
                              return (
                                <button
                                  key={bed.id}
                                  type="button"
                                  disabled={!isAvail}
                                  onClick={() => setSelectedBedId(bed.id)}
                                  className={clsx(
                                    'p-2 rounded-md border text-left text-xs transition-all',
                                    isBedSelected
                                      ? 'bg-[#16A34A] text-white border-[#16A34A] font-semibold shadow-xs'
                                      : isAvail
                                      ? 'bg-white dark:bg-[#141816] border-[#E7E7DF] text-[#242925] dark:text-white cursor-pointer'
                                      : 'opacity-50 cursor-not-allowed'
                                  )}
                                >
                                  <div className="font-bold">{bed.bedNumber}</div>
                                  <div
                                    className={clsx(
                                      'text-[10px]',
                                      isBedSelected ? 'text-white/80' : 'text-[#6F756F]'
                                    )}
                                  >
                                    {isAvail ? 'Available' : 'Booked'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stay Dates */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="booking-start-date"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] mb-1"
                      >
                        Move-in Date
                      </label>
                      <input
                        id="booking-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-10 px-2.5 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg text-xs font-medium outline-none focus:border-[#173D32]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="booking-end-date"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] mb-1"
                      >
                        End Date
                      </label>
                      <input
                        id="booking-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-10 px-2.5 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg text-xs font-medium outline-none focus:border-[#173D32]"
                      />
                    </div>
                  </div>

                  {/* Transparent Price Breakdown */}
                  <div className="p-3.5 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] space-y-2 text-xs">
                    <div className="flex justify-between text-[#5E645E] dark:text-[#9EA69F]">
                      <span>
                        Rental rate ({getRentalPeriodLabel(property.type, property.pricePeriod, false)})
                      </span>
                      <span className="font-semibold text-[#242925] dark:text-white">
                        {formatCedis(displayPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#5E645E] dark:text-[#9EA69F]">
                      <span>Refundable caution deposit</span>
                      <span className="font-semibold text-[#242925] dark:text-white">
                        {cautionDepositAmt > 0 ? formatCedis(cautionDepositAmt) : 'GH₵ 0'}
                      </span>
                    </div>
                    {parsedUtilities.length > 0 && (
                      <div className="flex justify-between text-[#165B36] dark:text-emerald-400 text-[11px]">
                        <span>Included utilities</span>
                        <span className="font-semibold">{parsedUtilities.join(', ')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A] flex justify-between items-baseline font-bold text-sm text-[#242925] dark:text-white">
                      <span>Total initial amount</span>
                      <span>{formatCedis(displayPrice + cautionDepositAmt)}</span>
                    </div>
                  </div>

                  {/* Primary & Secondary Actions */}
                  <div className="space-y-2.5 pt-1">
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      disabled={
                        isBooking ||
                        Boolean(myActiveBookingData) ||
                        (currentRoom?.roomUnits?.length > 0 && !selectedBedId) ||
                        currentRoom?.isSoldOut
                      }
                    >
                      {myActiveBookingData
                        ? 'Active Booking on Record'
                        : currentRoom?.isSoldOut
                        ? 'Selected Unit Full'
                        : 'Reserve Accommodation'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      size="md"
                      onClick={() => setShowViewingModal(true)}
                      leftIcon={<CalendarDays className="w-4 h-4 text-[#557A67]" />}
                    >
                      Schedule On-Site Inspection
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between text-[11px] text-[#6F756F]">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Transparent terms</span>
                    </span>
                    <Link
                      href={`/support?propertyId=${encodeURIComponent(property.id)}&subject=${encodeURIComponent(`Listing Report: ${property.title}`)}`}
                      className="hover:text-[#9E2A2B] underline"
                    >
                      Report listing issue
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEQUENTIAL RESERVATION & CONFIRMATION DIALOG (Section 14) ── */}
      {showReservationSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reservation-modal-title"
        >
          <div className="bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A] p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7DF] dark:border-[#262E2A]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#557A67] block">
                  Reservation Review
                </span>
                <h3
                  id="reservation-modal-title"
                  className="font-editorial text-xl text-[#242925] dark:text-white"
                >
                  {createdBookingId ? 'Booking Request Submitted' : 'Confirm your booking details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReservationSheet(false)}
                aria-label="Close reservation dialog"
                className="p-1.5 rounded-lg text-[#6F756F] hover:text-[#242925] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdBookingId ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-lg bg-[#EDF6F0] border border-[#C5E2D0] text-[#165B36] space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reservation recorded</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Your booking request for <strong>{property.title}</strong> has been created. You can track host approval and complete escrow payment from your booking details page.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Link
                    href={`/bookings/${createdBookingId}`}
                    className="flex-1 h-11 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <span>Open Booking Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                {/* Step 1: Selected Accommodation Summary */}
                <div className="p-3.5 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] space-y-1">
                  <div className="font-bold text-[#242925] dark:text-white">{property.title}</div>
                  <div className="text-xs text-[#6F756F]">{property.location}</div>
                  {selectedRoom && (
                    <div className="text-xs font-semibold text-[#173D32] dark:text-emerald-400 pt-1">
                      Unit Type: {selectedRoom.roomType}
                      {selectedUnitObj ? ` • Door ${selectedUnitObj.unitNumber}` : ''}
                      {selectedBedObj ? ` • ${selectedBedObj.bedNumber}` : ''}
                    </div>
                  )}
                </div>

                {/* Step 2: Price Breakdown */}
                <div className="p-3.5 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6F756F]">
                      Rent ({getRentalPeriodLabel(property.type, property.pricePeriod, false)})
                    </span>
                    <span className="font-semibold">{formatCedis(displayPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F756F]">Refundable Caution Deposit</span>
                    <span className="font-semibold">{formatCedis(cautionDepositAmt)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A] flex justify-between font-bold text-sm">
                    <span>Total Amount</span>
                    <span className="text-[#173D32] dark:text-emerald-400">
                      {formatCedis(displayPrice + cautionDepositAmt)}
                    </span>
                  </div>
                </div>

                {/* Step 3: Terms Confirmation */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E7E7DF] accent-[#173D32]"
                  />
                  <span className="text-xs text-[#5E645E] dark:text-[#9EA69F] leading-relaxed">
                    I have reviewed the property details, pricing in GH₵, house rules, and agree to submit this reservation request.
                  </span>
                </label>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setShowReservationSheet(false)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    isLoading={isBooking}
                    disabled={!agreedToTerms}
                    onClick={handleConfirmBookingSubmission}
                  >
                    Confirm &amp; Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PHYSICAL INSPECTION MODAL ── */}
      {showViewingModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule physical inspection"
        >
          <div className="bg-white dark:bg-[#141816] rounded-xl border border-[#E7E7DF] dark:border-[#262E2A] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7DF] dark:border-[#262E2A]">
              <h3 className="font-editorial text-lg text-[#242925] dark:text-white">
                Schedule On-Site Inspection
              </h3>
              <button
                type="button"
                onClick={() => setShowViewingModal(false)}
                aria-label="Close modal"
                className="text-[#6F756F] hover:text-[#242925]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleViewing} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#242925] dark:text-white mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={viewingDate}
                  onChange={(e) => setViewingDate(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#242925] dark:text-white mb-1">
                  Preferred Time Window *
                </label>
                <select
                  value={viewingTime}
                  onChange={(e) => setViewingTime(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                >
                  <option value="Morning (9:00 AM - 12:00 PM)">Morning (9:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (1:00 PM - 3:30 PM)">Afternoon (1:00 PM - 3:30 PM)</option>
                  <option value="Late Afternoon (4:00 PM - 6:00 PM)">
                    Late Afternoon (4:00 PM - 6:00 PM)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#242925] dark:text-white mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={viewingPhone}
                  onChange={(e) => setViewingPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className="w-full h-10 px-3 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#242925] dark:text-white mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={viewingNotes}
                  onChange={(e) => setViewingNotes(e.target.value)}
                  placeholder="Any specific questions for the host..."
                  className="w-full p-3 bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowViewingModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" fullWidth isLoading={viewingSubmitting}>
                  Request Inspection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PHOTO LIGHTBOX DIALOG ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Property photo gallery"
        >
          <div className="flex items-center justify-between text-white">
            <span className="text-xs sm:text-sm font-medium">
              Photo {lightboxIndex + 1} of {galleryImages.length} &bull; {property.title}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close photo gallery"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative my-4">
            {galleryImages.length > 1 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === null || prev === 0 ? galleryImages.length - 1 : prev - 1
                  )
                }
                className="absolute left-2 sm:left-6 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img
              src={galleryImages[lightboxIndex]}
              alt={`${property.title} — photo ${lightboxIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />
            {galleryImages.length > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === null || prev === galleryImages.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-2 sm:right-6 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── COMPACT MOBILE BOOKING ACTION BAR ── */}
      {!myActiveBookingData && property?.isAvailable !== false && !isStaffOrLandlord && (
        <div className="lg:hidden fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#141816]/95 backdrop-blur-md border-t border-[#E7E7DF] dark:border-[#262E2A] px-4 py-3 flex items-center justify-between gap-4">
          <PriceDisplay
            amount={displayPrice}
            propertyType={property.type}
            billingCycle={property.pricePeriod}
            size="md"
          />
          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById('booking-widget');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Reserve Unit
          </Button>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
