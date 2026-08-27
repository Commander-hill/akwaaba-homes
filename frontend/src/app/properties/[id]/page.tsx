'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, MapPin, CheckCircle, Bed, ArrowLeft, Calendar, Home, Users, Star, Info, Flag, Send, X, ShieldCheck, Lock, Clock } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
import CampusTransportMap from '@/components/CampusTransportMap';
import WishlistButton from '@/components/WishlistButton';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedRoomUnitId, setSelectedRoomUnitId] = useState<string>('');
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    retry: false
  });

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data.property;
    }
  });

  useEffect(() => {
    if (session && session.role === 'LANDLORD') {
      router.push('/dashboard/landlord');
    }
  }, [session, router]);

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', propertyId],
    queryFn: async () => {
      const res = await api.get(`/reviews/property/${propertyId}`);
      return res.data;
    }
  });

  const queryClient = useQueryClient();

  // Inline Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const flagMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.put(`/reviews/${reviewId}/flag`, { reason: 'Reported by user' });
    }
  });

  // Find if this tenant has a completed booking at this property
  const { data: tenantBookingsData } = useQuery({
    queryKey: ['bookings', 'tenant', 'property', propertyId],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
    enabled: !!session && session.role === 'TENANT',
    retry: false
  });

  // Fetch single active/pending booking for the current user (Platform-wide)
  const { data: myActiveBookingData, refetch: refetchActiveBooking } = useQuery({
    queryKey: ['bookings', 'my-active'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/my-active');
      return data.booking;
    },
    enabled: !!session && session.role === 'TENANT',
    retry: false
  });

  // Fetch Campus Landmark Distances & Transit Fares (GIS Hub)
  const { data: landmarkData } = useQuery({
    queryKey: ['property', propertyId, 'landmarks'],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/properties/${propertyId}/landmarks`);
        return data;
      } catch (err) {
        return null;
      }
    },
    enabled: !!propertyId
  });

  const cancelPendingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      setBookingMessage({ text: 'Pending booking cancelled. You may now book a new room.', type: 'success' });
      refetchActiveBooking();
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      setBookingMessage({ text: err.response?.data?.message || 'Failed to cancel pending booking', type: 'error' });
    }
  });

  // 15-Minute Reservation Expiry Timer for Pending Bookings
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!myActiveBookingData || myActiveBookingData.status !== 'PENDING' || !myActiveBookingData.createdAt) {
      setSecondsRemaining(null);
      return;
    }

    const createdAtMs = new Date(myActiveBookingData.createdAt).getTime();
    const expiresAtMs = createdAtMs + 15 * 60 * 1000;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        refetchActiveBooking();
        queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [myActiveBookingData]);

  const completedBookingForProperty = tenantBookingsData?.bookings?.find(
    (b: any) => b.propertyId === propertyId && b.status === 'COMPLETED'
  );

  const reviewMutation = useMutation({
    mutationFn: async (reviewData: { bookingId: string; rating: number; comment: string }) => {
      const res = await api.post('/reviews', reviewData);
      return res.data;
    },
    onSuccess: () => {
      setReviewMsg({ text: '✅ Review submitted! Thank you for your feedback.', type: 'success' });
      setReviewComment('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['reviews', propertyId] });
    },
    onError: (err: any) => {
      setReviewMsg({ text: err.response?.data?.message || 'Failed to submit review', type: 'error' });
    }
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.role !== 'TENANT' && session.role !== 'ADMIN') {
      setBookingMessage({ text: 'Only tenants can book properties.', type: 'error' });
      return;
    }

    // Check if room requires Room Unit and Bed selection
    const currentRoom = property?.rooms?.find((r: any) => r.id === selectedRoomId);
    if (currentRoom && currentRoom.roomUnits && currentRoom.roomUnits.length > 0) {
      if (!selectedRoomUnitId || !selectedBedId) {
        setBookingMessage({ text: '⚠️ Please select your Room Unit Number and Bed Slot before proceeding.', type: 'error' });
        return;
      }
    }

    // ── STRICT PROFILE COMPLETENESS & VERIFICATION CHECK FOR TENANTS ──
    if (session.role === 'TENANT') {
      const requiredProfileFields = [
        'firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth',
        'nationality', 'guardianName', 'guardianPhone', 'campus', 'studentId',
        'dateOfAdmission', 'programmeOfStudy', 'yearOfStudy', 'studentType'
      ];

      const isProfileIncomplete = requiredProfileFields.some(field => !session[field] || !String(session[field]).trim());

      if (isProfileIncomplete) {
        setBookingMessage({ 
          text: '📋 Profile Incomplete: Please complete ALL mandatory details on your Profile page (including Gender & Student credentials) before booking. Redirecting to Profile page...', 
          type: 'error' 
        });
        setTimeout(() => {
          router.push('/dashboard/profile');
        }, 2200);
        return;
      }

      if (!session.ghanaCardStatus || session.ghanaCardStatus === 'NOT_SUBMITTED') {
        setBookingMessage({ 
          text: '🆔 Identity Verification Required: Please submit your Ghana Card details on the Verification page before booking. Redirecting to Verification page...', 
          type: 'error' 
        });
        setTimeout(() => {
          router.push('/dashboard/verification');
        }, 2200);
        return;
      }
    }

    setIsBooking(true);
    setBookingMessage(null);
    setShowPaymentModal(true);
    setIsBooking(false);
  };

  const handleConfirmPayment = async () => {
    setIsBooking(true);
    setBookingMessage(null);
    setShowPaymentModal(false);

    try {
      const { data } = await api.post('/bookings', {
        propertyId,
        roomId: selectedRoomId,
        roomUnitId: selectedRoomUnitId || null,
        bedId: selectedBedId || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      if (data.authorization_url) {
        // Redirect directly to Paystack payment checkout page
        window.location.href = data.authorization_url;
      } else {
        setBookingMessage({ text: 'Booking request sent successfully!', type: 'success' });
        setStartDate('');
        setEndDate('');
        setSelectedRoomId('');
        setSelectedRoomUnitId('');
        setSelectedBedId('');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to request booking';
      setBookingMessage({ text: errorMsg, type: 'error' });
      if (error.response?.data?.redirectTo) {
        setTimeout(() => {
          router.push(error.response.data.redirectTo);
        }, 2200);
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  if (!property) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center font-bold text-2xl">Property not found</div>;
  }

  const parsedImages = Array.isArray(property.images) ? property.images : (property.images ? JSON.parse(property.images) : []);
  const parsedAmenities = Array.isArray(property.amenities) ? property.amenities : (property.amenities ? JSON.parse(property.amenities) : []);
  const mainImage = parsedImages.length > 0 ? getImageUrl(parsedImages[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

  const selectedRoom = property.rooms?.find((r: any) => r.id === selectedRoomId);
  const displayPrice = selectedRoom ? selectedRoom.price : property.price;

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-8 space-y-12 min-h-[calc(100vh-4rem)]">
      <Link href="/properties" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors w-fit font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      {/* ── TOP HERO SECTION: GALLERY & PROPERTY HEADER (FULL WIDTH) ── */}
      <div className="space-y-8">
        <div className="flex gap-4 h-[480px]">
            <div className="flex-1 rounded-3xl overflow-hidden shadow-md">
              <img src={mainImage} alt={property.title} className="w-full h-full object-cover" />
            </div>
            {parsedImages.length > 1 && (
              <div className="w-[30%] hidden md:flex flex-col gap-4">
                {parsedImages.slice(1, 3).map((img: string, idx: number) => (
                  <div key={idx} className="flex-1 rounded-2xl overflow-hidden shadow-md relative">
                    <img src={getImageUrl(img)} alt={`${property.title} ${idx + 2}`} className="w-full h-full object-cover" />
                    {idx === 1 && parsedImages.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors">
                        <span className="text-white font-bold text-xl">+{parsedImages.length - 3}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">{property.title}</h1>
                {property.landlord?.isVerifiedLandlord && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Verified Landlord 🛡️
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-right">
                <WishlistButton propertyId={property.id} showText={true} />
                <div>
                  {!selectedRoomId && <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Starting from</div>}
                  <div className="text-3xl font-bold text-[var(--primary)]">GH₵{displayPrice}</div>
                  <div className="text-sm text-[var(--muted-foreground)]">per academic year</div>
                </div>
              </div>
            </div>
            <div className="flex items-center text-[var(--muted-foreground)] mb-6 gap-1">
              <MapPin className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-lg">{property.location}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Home className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs font-semibold uppercase">Type</div>
                <div className="font-bold">{property.type || 'Hostel'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Bed className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs font-semibold uppercase">Room Types</div>
                <div className="font-bold">{property.rooms?.length || 0} Options</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-[var(--muted-foreground)] text-xs font-semibold uppercase">Total Capacity</div>
                <div className="font-bold">{property.totalCapacity} beds</div>
              </div>
            </div>
            {/* Live Availability Block */}
            <div className="col-span-2 md:col-span-1">
              <div className={`rounded-2xl p-4 border ${
                property.remainingCapacity === 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : property.remainingCapacity <= Math.ceil((property.totalCapacity || 1) * 0.25)
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Availability</span>
                  <span className={`text-xs font-extrabold ${
                    property.remainingCapacity === 0 ? 'text-red-600' :
                    property.remainingCapacity <= Math.ceil((property.totalCapacity || 1) * 0.25) ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {property.remainingCapacity === 0 ? 'FULL' :
                     property.remainingCapacity <= Math.ceil((property.totalCapacity || 1) * 0.25) ? 'ALMOST FULL' : 'AVAILABLE'}
                  </span>
                </div>
                <div className="text-2xl font-extrabold mb-2">
                  {property.remainingCapacity ?? '–'}
                  <span className="text-sm font-medium text-[var(--muted-foreground)]"> / {property.totalCapacity} beds left</span>
                </div>
                <div className="h-2 bg-white/60 dark:bg-slate-900/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      property.remainingCapacity === 0 ? 'bg-red-400' :
                      property.remainingCapacity <= Math.ceil((property.totalCapacity || 1) * 0.25) ? 'bg-amber-400' :
                      'bg-emerald-400'
                    }`}
                    style={{ width: property.totalCapacity > 0 ? `${Math.round((property.remainingCapacity / property.totalCapacity) * 100)}%` : '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

      </div>

      {/* ── GIS CAMPUS DISTANCE & TRANSIT TIME HUB ── */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-xl w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
              <span>🗺️</span> GIS Campus Landmark &amp; Transit Hub
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Proximity to {landmarkData?.campus || 'Campus'} Landmarks</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Calculated walking, TroTro shuttle, and Okada motor fares.</p>
          </div>

          {/* Neighborhood Ratings */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-[var(--border)] shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-[var(--muted-foreground)] uppercase block">Safety Score</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">🛡️ 4.8 / 5.0</span>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-[var(--muted-foreground)] uppercase block">Study Quietness</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">📚 4.6 / 5.0</span>
            </div>
          </div>
        </div>

        {/* Landmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(landmarkData?.landmarks || [
            { name: 'Central Library', type: 'LIBRARY', distanceKm: 0.8, walkingTimeMins: 10, drivingTimeMins: 3, trotroFareGHS: 3.5, okadaFareGHS: 7.0 },
            { name: 'Science Auditorium', type: 'LECTURE_HALL', distanceKm: 1.2, walkingTimeMins: 15, drivingTimeMins: 4, trotroFareGHS: 3.5, okadaFareGHS: 8.0 },
            { name: 'Main Campus Gate', type: 'CAMPUS_GATE', distanceKm: 0.5, walkingTimeMins: 6, drivingTimeMins: 2, trotroFareGHS: 3.5, okadaFareGHS: 6.25 },
            { name: 'Shuttle Station', type: 'BUS_STOP', distanceKm: 1.8, walkingTimeMins: 22, drivingTimeMins: 6, trotroFareGHS: 5.5, okadaFareGHS: 9.5 }
          ]).map((lm: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-[var(--border)] space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-[var(--foreground)]">{lm.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {lm.distanceKm} km
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
                <div className="flex justify-between items-center">
                  <span>🚶 Walking Time</span>
                  <span className="font-bold text-[var(--foreground)]">{lm.walkingTimeMins} mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>🚐 TroTro Shuttle</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">GHS {lm.trotroFareGHS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>🏍️ Okada Express</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">GHS {lm.okadaFareGHS.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: REQUEST BOOKING (FULL WIDTH EDGE-TO-EDGE) ── */}
      <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[var(--border)] shadow-xl w-full">
        <h2 className="text-3xl font-extrabold mb-2 text-[var(--foreground)]">Request Booking</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">Select your dates and preferred room unit to request this accommodation.</p>

        {/* ── SINGLE ACTIVE BOOKING SCENARIO BANNERS & OWNERSHIP CARDS ── */}
        {myActiveBookingData && (
          <div className="mb-6 space-y-4">
            {/* SCENARIO A: Tenant has an active/completed booking at THIS exact property */}
            {myActiveBookingData.propertyId === propertyId && myActiveBookingData.status !== 'PENDING' && (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/50 text-emerald-900 dark:text-emerald-100 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                      <span>🏠</span> YOUR ACTIVE BOOKING AT THIS HOSTEL
                    </div>
                    <h4 className="text-lg font-black text-emerald-950 dark:text-emerald-50">
                      {myActiveBookingData.room?.roomType} {myActiveBookingData.room?.blockName ? `(${myActiveBookingData.room.blockName})` : ''}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      {myActiveBookingData.roomUnit ? `Unit: ${myActiveBookingData.roomUnit.unitNumber}` : ''} 
                      {myActiveBookingData.bed ? ` • Bed Slot: ${myActiveBookingData.bed.bedNumber}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href="/dashboard/tenant"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>📑</span> View Booking & Receipt
                    </Link>
                    <Link
                      href="/dashboard/messages"
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>💬</span> Chat Landlord
                    </Link>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span>🔒</span> You already hold an active room at this hostel. Multi-room bookings are locked to maintain student capacity fairness.
                </div>
              </div>
            )}

            {/* SCENARIO B: Tenant has an active/completed booking at ANOTHER property */}
            {myActiveBookingData.propertyId !== propertyId && myActiveBookingData.status !== 'PENDING' && (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/50 text-amber-900 dark:text-amber-100 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                      <span>🛑</span> ACTIVE BOOKING LOCKED
                    </div>
                    <h4 className="text-lg font-black text-amber-950 dark:text-amber-50">
                      You already hold a confirmed room at "{myActiveBookingData.property?.title || 'another hostel'}"
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Akwaaba Homes policy enforces one active accommodation booking per student.
                    </p>
                  </div>
                  <Link
                    href={`/properties/${myActiveBookingData.propertyId}`}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <span>🏢</span> View My Active Hostel
                  </Link>
                </div>
              </div>
            )}

            {/* SCENARIO C: Tenant has an UNPAID PENDING booking */}
            {myActiveBookingData.status === 'PENDING' && (
              <div className="p-6 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-500/50 text-sky-900 dark:text-sky-100 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-1">
                      <span>⏳</span> UNPAID PENDING BOOKING IN PROGRESS
                    </div>
                    <h4 className="text-lg font-black text-sky-950 dark:text-sky-50">
                      You have an unpaid booking request at "{myActiveBookingData.property?.title}" ({myActiveBookingData.room?.roomType})
                    </h4>
                    <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
                      Complete payment to lock your room, or cancel it if you wish to select a room at this hostel instead.
                    </p>
                    {secondsRemaining !== null && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-mono font-extrabold text-xs border border-amber-300 dark:border-amber-700 shadow-sm">
                        <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                        <span>Hold Expires In: {Math.floor(secondsRemaining / 60)}m {String(secondsRemaining % 60).padStart(2, '0')}s</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href="/dashboard/tenant"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>💳</span> Complete Payment
                    </Link>
                    <button
                      type="button"
                      disabled={cancelPendingMutation.isPending}
                      onClick={() => cancelPendingMutation.mutate(myActiveBookingData.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {cancelPendingMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>❌</span>
                      )}
                      Cancel Pending Booking
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {bookingMessage && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 border ${bookingMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-900/50' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:border-red-900/50'}`}>
            {bookingMessage.text}
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="block text-base font-bold text-[var(--foreground)]">Select Block & Room Type</label>
              {session?.gender && (
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Logged in as {session.gender === 'MALE' ? '♂ Male' : '♀ Female'}
                </span>
              )}
            </div>

            {session?.gender && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] text-xs text-[var(--muted-foreground)] flex items-center justify-between">
                <span className="font-semibold">
                  Showing blocks for {session.gender === 'MALE' ? 'Male & Mixed' : 'Female & Mixed'} occupants
                </span>
              </div>
            )}

            <div className="space-y-4">
              {property.rooms?.map((room: any, index: number) => {
                const userGender = session?.gender?.toUpperCase();
                const isGenderRestricted = Boolean(userGender && room.gender !== 'MIXED' && room.gender !== userGender);
                const isFullyBooked = room.remainingCapacity === 0;
                const isDisabled = isFullyBooked || isGenderRestricted;

                const genderBadge = room.gender === 'MALE'
                  ? { label: '♂ Male Only Block', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
                  : room.gender === 'FEMALE'
                  ? { label: '♀ Female Only Block', cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800' }
                  : { label: '🔀 Mixed Block (Open to All)', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };

                const blockTitle = room.blockName?.trim() ? room.blockName : `Block Configuration ${index + 1}`;

                return (
                  <label 
                    key={room.id}
                    className={`block relative p-5 border rounded-2xl transition-all ${
                      isDisabled
                        ? 'opacity-60 cursor-not-allowed bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                        : selectedRoomId === room.id 
                        ? 'border-[var(--primary)] bg-indigo-50/60 dark:bg-indigo-900/30 shadow-md ring-2 ring-[var(--primary)]/30' 
                        : 'border-[var(--border)] bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <input 
                          type="radio" 
                          name="roomSelection" 
                          value={room.id}
                          disabled={isDisabled}
                          checked={selectedRoomId === room.id}
                          onChange={() => {
                            if (!isDisabled) {
                              setSelectedRoomId(room.id);
                              setSelectedRoomUnitId('');
                              setSelectedBedId('');
                            }
                          }}
                          className="w-4 h-4 mt-1 text-[var(--primary)] focus:ring-[var(--primary)] disabled:cursor-not-allowed"
                        />
                        <div className="space-y-1 flex-1">
                          <div className="font-extrabold text-lg text-[var(--foreground)] flex items-center gap-1.5 leading-snug">
                            <span>🏢</span> {blockTitle}
                          </div>
                          
                          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1">
                            <span>🛏️</span> {room.roomType}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${genderBadge.cls}`}>
                              {genderBadge.label}
                            </span>

                            {isGenderRestricted && (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1">
                                🔒 Restricted to {room.gender === 'MALE' ? 'Male' : 'Female'} Students
                              </span>
                            )}

                            <span className="text-xs font-medium text-[var(--muted-foreground)]">
                              {isFullyBooked 
                                ? <span className="text-red-500 font-bold">Fully Booked</span> 
                                : `${room.remainingCapacity} of ${room.totalCapacity} beds left`
                              }
                            </span>
                          </div>

                          {isGenderRestricted && (
                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
                              ⚠ You cannot book this room because your profile gender is {session?.gender === 'MALE' ? 'Male' : 'Female'}.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <div className="font-black text-xl text-[var(--foreground)]">GH₵{room.price}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">per year</div>
                      </div>
                    </div>

                    {/* ── INTERACTIVE ROOM UNIT & BED SELECTOR (EDGE TO EDGE FULL WIDTH GRID) ── */}
                    {selectedRoomId === room.id && room.roomUnits && room.roomUnits.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                              <span>🏢</span> CHOOSE ROOM UNIT NUMBER
                            </h4>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">Step 1 of 2</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {room.roomUnits.map((unit: any) => {
                              const userGender = session?.gender?.toUpperCase();
                              const isUnitGenderRestricted = Boolean(userGender && unit.genderLock !== 'UNASSIGNED' && unit.genderLock !== userGender);
                              const availableBeds = unit.beds ? unit.beds.filter((b: any) => b.status === 'AVAILABLE') : [];
                              const isUnitFull = unit.beds && unit.beds.length > 0 && availableBeds.length === 0;
                              const isUnitDisabled = isUnitFull || isUnitGenderRestricted;

                              const isSelectedUnit = selectedRoomUnitId === unit.id;

                              return (
                                <button
                                  key={unit.id}
                                  type="button"
                                  disabled={isUnitDisabled}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedRoomUnitId(unit.id);
                                    setSelectedBedId('');
                                  }}
                                  className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all relative ${
                                    isUnitDisabled
                                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                      : isSelectedUnit
                                      ? 'border-[var(--primary)] bg-indigo-100/80 dark:bg-indigo-900/60 text-[var(--foreground)] ring-2 ring-[var(--primary)]/50 shadow-sm'
                                      : 'border-[var(--border)] bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-[var(--foreground)]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-sm">{unit.unitNumber}</span>
                                    {unit.genderLock !== 'UNASSIGNED' && (
                                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                        unit.genderLock === 'MALE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                                      }`}>
                                        {unit.genderLock === 'MALE' ? '♂ Male' : '♀ Female'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center text-[11px] text-[var(--muted-foreground)]">
                                    <span>Floor {unit.floor}</span>
                                    <span className={availableBeds.length > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-500 font-bold'}>
                                      {availableBeds.length} bed(s)
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── STEP 2: BED SELECTION GRID ── */}
                        {selectedRoomUnitId && (
                          <div className="mt-4 pt-4 border-t border-dashed border-[var(--border)] space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                <span>🛏️</span> SELECT YOUR BED SLOT
                              </h4>
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Step 2 of 2</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {(() => {
                                const currentUnit = room.roomUnits.find((u: any) => u.id === selectedRoomUnitId);
                                if (!currentUnit || !currentUnit.beds) return null;

                                return currentUnit.beds.map((bed: any) => {
                                  const isBedAvailable = bed.status === 'AVAILABLE';
                                  const isSelectedBed = selectedBedId === bed.id;

                                  return (
                                    <button
                                      key={bed.id}
                                      type="button"
                                      disabled={!isBedAvailable}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedBedId(bed.id);
                                      }}
                                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                                        !isBedAvailable
                                          ? 'opacity-40 cursor-not-allowed bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-600'
                                          : isSelectedBed
                                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/50 shadow-sm font-bold'
                                          : 'border-[var(--border)] bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between font-extrabold">
                                        <span>🛏️ {bed.bedNumber}</span>
                                        {isSelectedBed && <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓ Selected</span>}
                                      </div>
                                      <div className="text-[11px] mt-1">
                                        {isBedAvailable ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Available</span>
                                        ) : (
                                          <span className="text-red-500 font-bold">🔴 Occupied</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Start Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="date" required min={new Date().toISOString().split('T')[0]} className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">End Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="date" required min={startDate || new Date().toISOString().split('T')[0]} className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isBooking || !!myActiveBookingData || !selectedRoomId || (selectedRoom && selectedRoom.remainingCapacity === 0)}
                className={`flex-1 flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-white font-bold text-base transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  myActiveBookingData ? 'bg-slate-700 dark:bg-slate-800' : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:opacity-90'
                }`}
              >
                {isBooking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : myActiveBookingData ? (
                  myActiveBookingData.propertyId === propertyId ? '✓ Room Already Booked at this Property' :
                  myActiveBookingData.status === 'PENDING' ? '⏳ Pending Booking Request in Progress' :
                  '🔒 Booking Locked — Active Booking Elsewhere'
                ) : !selectedRoomId ? (
                  'Select a Room'
                ) : (selectedRoom && selectedRoom.remainingCapacity === 0) ? (
                  'Room Unavailable'
                ) : (
                  'Request to Book'
                )}
              </button>

              {property.landlordId && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!session) {
                      router.push('/login');
                      return;
                    }
                    try {
                      await api.post('/chat/conversations', { partnerId: property.landlordId });
                      router.push('/dashboard/tenant');
                    } catch (e) {
                      router.push('/dashboard/tenant');
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all text-sm"
                >
                  <Send className="w-4 h-4" /> Chat with Landlord
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ── SECTION 3: PROPERTY DETAILS (DESCRIPTION, AMENITIES, MAP, REVIEWS) ── */}
      <div className="space-y-8">
        <div className="glass-card p-8 rounded-3xl border border-[var(--border)]">
          <h2 className="text-2xl font-bold mb-4">Description</h2>
          <p className="text-[var(--muted-foreground)] leading-relaxed whitespace-pre-wrap">{property.description}</p>
        </div>

        {property.videoUrl && (
          <div className="glass-card p-8 rounded-3xl border border-[var(--border)] space-y-4">
            <h2 className="text-2xl font-bold">360° / Video Walkthrough</h2>
            <p className="text-[var(--muted-foreground)] text-sm mb-4">Take a virtual tour of this property to see every detail before you book.</p>
            <div className="rounded-2xl overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-xl bg-black relative w-full" style={{ paddingTop: '56.25%' }}>
              <video 
                controls 
                controlsList="nodownload"
                className="absolute top-0 left-0 w-full h-full object-cover"
                src={`http://localhost:5000${property.videoUrl}`}
                poster={property.images?.[0] ? `http://localhost:5000${property.images[0]}` : undefined}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <div className="glass-card p-8 rounded-3xl border border-[var(--border)]">
          <h2 className="text-2xl font-bold mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {parsedAmenities.map((amenity: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-[var(--foreground)] font-medium bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-[var(--border)]">
                <CheckCircle className="w-5 h-5 text-[var(--primary)]" /> {amenity}
              </div>
            ))}
          </div>
        </div>

        {/* Campus Transport & Landmark Proximity Map */}
        <CampusTransportMap 
          title={property.title}
          location={property.location}
          latitude={property.latitude || 5.1053}
          longitude={property.longitude || -1.2821}
        />

        {/* Location & Neighborhood Map */}
        {property.latitude && property.longitude && (
          <div className="glass-card p-8 rounded-3xl border border-[var(--border)] space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold">Location & Neighborhood</h2>
                <p className="text-[var(--muted-foreground)] text-sm mt-1">Explore nearby amenities, campuses, and transport links.</p>
              </div>
            </div>
            <div className="h-[400px] rounded-2xl overflow-hidden border border-[var(--border)] relative z-0">
              <Map 
                mode="view" 
                property={property}
                pois={[
                  { name: "University of Ghana", lat: 5.6508, lng: -0.1869 },
                  { name: "KNUST", lat: 6.6731, lng: -1.5674 },
                  { name: "Accra Mall", lat: 5.6226, lng: -0.1736 },
                  { name: "Legon Hospital", lat: 5.6457, lng: -0.1834 },
                ]}
              />
            </div>
          </div>
        )}

        {/* Reviews & Reputation Section */}
        <div className="glass-card p-8 rounded-3xl border border-[var(--border)] space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Verified Reviews</h2>
              {reviewsData?.totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.round(reviewsData.avgRating) ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                    ))}
                  </div>
                  <span className="font-bold">{reviewsData.avgRating?.toFixed(1)}</span>
                  <span className="text-[var(--muted-foreground)] text-sm">({reviewsData.totalReviews} verified {reviewsData.totalReviews === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-[var(--border)]">
            <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              <strong>How reviews work:</strong> Only tenants who have <strong>completed a verified stay</strong> at this property can submit a review. 
              One review is permitted per booking. Ratings are averaged from all eligible reviews to ensure fairness. 
              Disputed or flagged reviews are reviewed by administrators before they affect scores.
            </p>
          </div>

          {reviewsData?.reviews?.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8">No reviews yet. Be the first verified tenant to share your experience!</p>
          ) : (
            <div className="space-y-5">
              {reviewsData?.reviews?.map((review: any) => (
                <div key={review.id} className="pb-5 border-b border-[var(--border)] last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold">{review.author.firstName} {review.author.lastName}</div>
                      <div className="flex text-amber-500 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)]">{new Date(review.createdAt).toLocaleDateString()}</span>
                      {session && session.role === 'TENANT' && (
                        <button
                          onClick={() => { if (confirm('Report this review to admins for moderation?')) flagMutation.mutate(review.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          title="Report review"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {review.comment && <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {completedBookingForProperty && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Write a Review
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">You stayed here &mdash; share your experience to help other students.</p>

              {reviewMsg && (
                <div className={`p-4 rounded-xl text-sm font-medium mb-4 border ${reviewMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800'}`}>
                  {reviewMsg.text}
                </div>
              )}

              {reviewMsg?.type !== 'success' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Your Rating</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1 transition-transform hover:scale-125">
                          <Star className={`w-8 h-8 transition-colors ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold text-[var(--muted-foreground)]">{['','Poor','Fair','Good','Great','Excellent'][reviewRating]}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Your Comment</label>
                    <textarea
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Cleanliness, landlord responsiveness, location, value for money..."
                      className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reviewComment.trim()) { setReviewMsg({ text: 'Please write a comment.', type: 'error' }); return; }
                      reviewMutation.mutate({ bookingId: completedBookingForProperty.id, rating: reviewRating, comment: reviewComment });
                    }}
                    disabled={reviewMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {reviewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (() => {
        const selectedUnit = selectedRoom?.roomUnits?.find((u: any) => u.id === selectedRoomUnitId);
        const selectedBed = selectedUnit?.beds?.find((b: any) => b.id === selectedBedId);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        const durationDays = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : 365;

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-[var(--border)] rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
                  <span>📋</span> Final Booking Verification
                </div>
                <h3 className="text-2xl font-black text-[var(--foreground)]">Booking Summary</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Please review your detailed accommodation breakdown before completing payment.
                </p>
              </div>

              {/* Property Hero Banner */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-[var(--border)] mb-6">
                <img src={mainImage} alt={property.title} className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-base text-[var(--foreground)] truncate">{property.title}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" /> {property.address || property.location || 'Accra, Ghana'}
                  </p>
                </div>
              </div>

              {/* Itemized Details Grid */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider">Accommodation Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Block / Room Type */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Block / Type</span>
                    <span className="font-bold text-[var(--foreground)] text-right">{selectedRoom?.blockName || selectedRoom?.name || selectedRoom?.roomType}</span>
                  </div>

                  {/* Gender Designation */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Gender Lock</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      selectedRoom?.gender === 'MALE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      selectedRoom?.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {selectedRoom?.gender === 'MALE' ? '♂ Male Only' : selectedRoom?.gender === 'FEMALE' ? '♀ Female Only' : '⚧ Mixed Gender'}
                    </span>
                  </div>

                  {/* Room Unit Number */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Physical Unit</span>
                    <span className="font-extrabold text-[var(--primary)] text-right">
                      {selectedUnit ? `${selectedUnit.unitNumber} (Floor ${selectedUnit.floor})` : 'Auto Assigned'}
                    </span>
                  </div>

                  {/* Bed Assignment */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Bed Slot</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-right">
                      {selectedBed ? `🛏️ ${selectedBed.bedNumber}` : 'Standard Slot'}
                    </span>
                  </div>

                  {/* Primary Tenant */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Tenant Name</span>
                    <span className="font-bold text-[var(--foreground)] text-right truncate max-w-[130px]">
                      {session ? `${session.firstName} ${session.lastName}` : 'Verified Student'}
                    </span>
                  </div>

                  {/* Tenancy Tenure */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)] font-medium">Tenure Duration</span>
                    <span className="font-bold text-[var(--foreground)] text-right">
                      {durationDays >= 300 ? '1 Academic Year' : `${durationDays} Days`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check-In / Check-Out Dates Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-[var(--border)] mb-6 flex justify-around text-center text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)] block font-medium">Check-In Date</span>
                  <span className="font-extrabold text-sm text-[var(--foreground)] mt-0.5 block">
                    {start ? start.toLocaleDateString(undefined, { dateStyle: 'medium' }) : startDate}
                  </span>
                </div>
                <div className="border-r border-[var(--border)] my-1"></div>
                <div>
                  <span className="text-[var(--muted-foreground)] block font-medium">Check-Out Date</span>
                  <span className="font-extrabold text-sm text-[var(--foreground)] mt-0.5 block">
                    {end ? end.toLocaleDateString(undefined, { dateStyle: 'medium' }) : endDate}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Annual Room Rent</span>
                  <span className="font-semibold text-[var(--foreground)]">GHS {displayPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Escrow Security Deposit</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">GHS 0.00 (Included)</span>
                </div>
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Service & Processing Fee</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">GHS 0.00 (Waived)</span>
                </div>
                <div className="border-t border-indigo-200 dark:border-indigo-800/60 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="text-[var(--foreground)]">Total Due Today</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">GHS {displayPrice?.toLocaleString()}</span>
                </div>
              </div>

              {/* Escrow Guarantee Shield */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl mb-6 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block font-bold">100% Akwaaba Escrow Protection</strong>
                  Your payment will be held securely in escrow. Funds are only transferred to the landlord after your booking is confirmed. If rejected, an instant 100% full refund is issued.
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleConfirmPayment}
                className="w-full flex justify-center items-center gap-2 py-4 rounded-2xl text-white font-black text-lg bg-gradient-to-r from-[var(--primary)] via-indigo-600 to-purple-600 hover:opacity-95 transition-all shadow-xl shadow-[var(--primary)]/25 active:scale-[0.99]"
              >
                <Lock className="w-5 h-5" /> Pay GHS {displayPrice?.toLocaleString()} & Request Booking
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
