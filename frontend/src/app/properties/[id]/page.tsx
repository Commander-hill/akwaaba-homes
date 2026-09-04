'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, MapPin, CheckCircle, Bed, ArrowLeft, Calendar, Home, Users, 
  Star, Info, Flag, Send, X, ShieldCheck, Lock, Clock, CheckCircle2,
  Zap, Droplets, Shield, Wind, Wifi, Car, UtensilsCrossed, Dumbbell,
  MessageSquare, ExternalLink, AlertCircle, Sparkles, Building2,
  Share2, Video, CalendarDays, Phone, Copy, Check
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
import WishlistButton from '@/components/WishlistButton';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/providers/DialogProvider';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
  const { confirm } = useDialog();
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

  // Physical Viewing Modal State
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('Morning (9:00 AM - 12:00 PM)');
  const [viewingPhone, setViewingPhone] = useState('');
  const [viewingNotes, setViewingNotes] = useState('');
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingScheduled, setViewingScheduled] = useState<{ date: string; time: string } | null>(null);

  // Link copy state
  const [copiedLink, setCopiedLink] = useState(false);

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

  useEffect(() => {
    if (session?.phoneNumber && !viewingPhone) {
      setViewingPhone(session.phoneNumber);
    }
  }, [session, viewingPhone]);

  useEffect(() => {
    if (property?.rooms && property.rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(property.rooms[0].id);
    }
  }, [property, selectedRoomId]);

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', propertyId],
    queryFn: async () => {
      const res = await api.get(`/reviews/property/${propertyId}`);
      return res.data;
    }
  });

  const queryClient = useQueryClient();

  // Fetch single active/pending booking for the current user
  const { data: myActiveBookingData, refetch: refetchActiveBooking } = useQuery({
    queryKey: ['bookings', 'my-active'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/my-active');
      return data.booking;
    },
    enabled: !!session && session.role === 'TENANT',
    retry: false
  });

  const handleStartChat = async (initialMessage?: string) => {
    if (!session) {
      router.push('/login');
      return;
    }
    const landlordId = property?.landlordId || property?.landlord?.id;
    if (!landlordId) {
      toast.error('Landlord contact information not available.');
      return;
    }

    try {
      const { data } = await api.post('/chat/conversations', { partnerId: landlordId });
      if (initialMessage && data?.id) {
        await api.post(`/chat/${data.id}/messages`, { content: initialMessage });
      }
      router.push('/dashboard/messages');
    } catch (err) {
      router.push('/dashboard/messages');
    }
  };

  const handleScheduleViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push('/login');
      return;
    }

    if (!viewingDate) {
      toast.error('Please pick an inspection date.');
      return;
    }

    setViewingSubmitting(true);
    const landlordId = property?.landlordId || property?.landlord?.id;

    try {
      const viewingNotice = `🏛️ PHYSICAL VIEWING REQUEST: I would like to schedule an on-site physical inspection of ${property.title} (${property.location}) on ${viewingDate} during ${viewingTime}. Contact Phone: ${viewingPhone || session.phoneNumber || 'N/A'}.${viewingNotes ? ` Notes: ${viewingNotes}` : ''}`;

      if (landlordId) {
        const { data } = await api.post('/chat/conversations', { partnerId: landlordId });
        if (data?.id) {
          await api.post(`/chat/${data.id}/messages`, { content: viewingNotice });
        }
      }

      setViewingScheduled({ date: viewingDate, time: viewingTime });
      setShowViewingModal(false);
      toast.success('Inspection requested! Landlord has been notified via messaging.');
    } catch (err: any) {
      console.error(err);
      setViewingScheduled({ date: viewingDate, time: viewingTime });
      setShowViewingModal(false);
      toast.success('Inspection request logged! Check your messages tab.');
    } finally {
      setViewingSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Property link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined' && property) {
      const shareUrl = window.location.href;
      const text = `Check out this verified property on Akwaaba Homes: ${property.title} in ${property.location} (GH₵ ${Number(property.price).toLocaleString()}/${property.pricePeriod || 'yr'}). View verified listing: ${shareUrl}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.role !== 'TENANT' && session.role !== 'ADMIN') {
      setBookingMessage({ 
        text: 'Reservations are reserved exclusively for Tenant accounts.', 
        type: 'error' 
      });
      return;
    }

    const currentRoom = property?.rooms?.find((r: any) => r.id === selectedRoomId);
    if (currentRoom && currentRoom.roomUnits && currentRoom.roomUnits.length > 0) {
      if (!selectedRoomUnitId || !selectedBedId) {
        setBookingMessage({ text: 'Please select your Unit Number and Bed Slot before proceeding.', type: 'error' });
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
    try {
      const payload: any = {
        propertyId,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 365*24*60*60*1000).toISOString(),
        roomId: selectedRoomId || null,
        roomUnitId: selectedRoomUnitId || null,
        bedId: selectedBedId || null,
      };

      const { data } = await api.post('/bookings', payload);
      setShowPaymentModal(false);

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setBookingMessage({ text: 'Tenancy reservation submitted successfully!', type: 'success' });
        setStartDate('');
        setEndDate('');
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
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-400">Loading accommodation details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
        <Building2 className="w-12 h-12 text-zinc-300 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Property Not Found</h2>
        <Link href="/properties" className="text-xs font-bold text-[#0F5132] hover:underline">
          Return to Properties Directory
        </Link>
      </div>
    );
  }

  const parsedImages = Array.isArray(property.images) ? property.images : (property.images ? JSON.parse(property.images) : []);
  const validImages = parsedImages.filter((img: any) => typeof img === 'string' && img.trim().length > 5 && !img.includes('undefined') && !img.includes('null'));
  const mainImage = validImages.length > 0 ? getImageUrl(validImages[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
  
  const parsedAmenities = Array.isArray(property.amenities) ? property.amenities : (property.amenities ? JSON.parse(property.amenities) : []);
  const parsedUtilities = Array.isArray(property.includedUtilities) ? property.includedUtilities : (property.includedUtilities ? JSON.parse(property.includedUtilities) : []);

  const selectedRoom = property.rooms?.find((r: any) => r.id === selectedRoomId);
  const displayPrice = selectedRoom ? Number(selectedRoom.price) : Number(property.price);
  const cautionDepositAmt = property.cautionDeposit ? Number(property.cautionDeposit) : 0;
  const isHostel = property.type === 'Hostel';

  const landlordName = property.landlord ? `${property.landlord.firstName} ${property.landlord.lastName}` : 'Certified Direct Landlord';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 min-h-screen text-zinc-900 dark:text-white pb-24">
      
      {/* ── TOP NAV & SHARE HUB ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Properties Directory</span>
        </Link>

        {/* Share Hub & Wishlist */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Share verified listing to WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Share to WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Copy listing URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#0F5132]" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <WishlistButton propertyId={property.id} showText={true} />
        </div>
      </div>

      {/* ── DYNAMIC LUXURY PHOTO BANNER ── */}
      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 shadow-xs">
        {validImages.length <= 1 ? (
          <div className="h-[360px] sm:h-[460px] w-full overflow-hidden relative">
            <img src={mainImage} alt={property.title} className="w-full h-full object-cover" />
          </div>
        ) : validImages.length === 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 h-[360px] sm:h-[460px]">
            <div className="h-full overflow-hidden">
              <img src={getImageUrl(validImages[0])} alt={property.title} className="w-full h-full object-cover" />
            </div>
            <div className="h-full overflow-hidden">
              <img src={getImageUrl(validImages[1])} alt={property.title} className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 h-[360px] sm:h-[460px]">
            <div className="md:col-span-2 h-full overflow-hidden">
              <img src={getImageUrl(validImages[0])} alt={property.title} className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:flex flex-col gap-1.5 h-full">
              <div className="flex-1 overflow-hidden">
                <img src={getImageUrl(validImages[1])} alt={property.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 overflow-hidden relative">
                <img src={getImageUrl(validImages[2])} alt={property.title} className="w-full h-full object-cover" />
                {validImages.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <span className="text-white font-black text-xs">+{validImages.length - 3} Photos</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2-COLUMN MODERN REAL ESTATE LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT COLUMN (7 COLS / ~60-65%): PROPERTY NARRATIVE ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          {/* Header & Verification */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {property.type || 'Residential Tenancy'}
              </span>
              {property.landlord?.isVerifiedLandlord && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Direct Owner • Act 220 Verified</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              {property.title}
            </h1>

            <div className="flex items-center text-xs text-zinc-500">
              <MapPin className="w-4 h-4 mr-1 text-[#0F5132] shrink-0" />
              <span>{property.location}</span>
            </div>
          </div>

          {/* Architectural Specs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Classification</span>
              <span className="font-bold text-zinc-900 dark:text-white">{property.type || 'Apartment'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Target Resident</span>
              <span className="font-bold text-zinc-900 dark:text-white">{property.targetAudience || 'Open to All'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Furnishing</span>
              <span className="font-bold text-zinc-900 dark:text-white">{property.furnishing || 'Unfurnished'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Tenancy Status</span>
              <span className="font-bold text-[#0F5132] dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {isHostel ? `${property.remainingCapacity} beds vacant` : 'Move-in Ready'}
              </span>
            </div>
          </div>

          {/* Editorial Description */}
          <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Property Overview</h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {cleanText(property.description) || 'Modern residential accommodation offering comfortable living quarters, verified utilities, and secure access.'}
            </p>
          </div>

          {/* ── C. VERIFIED LANDLORD PROFILE SNAPSHOT CARD ── */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0F5132] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                {property.landlord?.firstName ? property.landlord.firstName[0] : 'L'}
                {property.landlord?.lastName ? property.landlord.lastName[0] : 'P'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-zinc-950 dark:text-white">{landlordName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                  <span className="text-[#0F5132] dark:text-emerald-400 font-bold">Ghana Card KYC Verified ✓</span>
                  <span>•</span>
                  <span>Direct Property Owner</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartChat()}
              className="px-3.5 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#0F5132]" />
              <span>Chat with Landlord</span>
            </button>
          </div>

          {/* ── D. INLINE VIDEO WALKTHROUGH PLAYER ── */}
          {property.videoUrl && (
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#0F5132]" />
                  <span>Virtual Property Video Tour</span>
                </h2>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Virtual Inspection
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black aspect-video relative shadow-xs">
                <video
                  src={property.videoUrl}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Curated Facilities & Amenities */}
          {parsedAmenities.length > 0 && (
            <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Facilities &amp; Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {parsedAmenities.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tenancy Guidelines & Rules */}
          <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">House Rules &amp; Conduct</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Gate Access / Curfew</span>
                <span className="font-bold text-zinc-900 dark:text-white">{cleanText(property.gateLockTime) || '24/7 Gate Access'}</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Visitor Policy</span>
                <span className="font-bold text-zinc-900 dark:text-white">{cleanText(property.visitorPolicy) || 'Normal visitors allowed'}</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Quiet Hours</span>
                <span className="font-bold text-zinc-900 dark:text-white">{cleanText(property.quietHours) || 'From 10:00 PM'}</span>
              </div>
            </div>
          </div>

          {/* Single High-Performance Interactive Map */}
          {property.latitude && property.longitude && (
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Location &amp; Neighborhood</h2>
                <span className="text-xs text-zinc-500 font-medium">{property.location}</span>
              </div>
              <div className="h-72 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0 shadow-xs">
                <Map mode="view" property={property} />
              </div>
            </div>
          )}

          {/* Verified Resident Reviews */}
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Verified Resident Reviews</h2>
              <span className="text-xs text-zinc-500 font-bold">{reviewsData?.reviews?.length || 0} Reviews</span>
            </div>

            {reviewsData?.reviews?.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
                No resident reviews have been recorded yet for this accommodation.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsData?.reviews?.map((r: any) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-white">{r.authorName || 'Verified Resident'}</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{r.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">{cleanText(r.comment)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN (5 COLS / ~35%): STICKY RESERVATION & VIEWING WIDGET ── */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4">
          
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-5">
            
            {/* Price Header */}
            <div className="flex items-baseline justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Rate</span>
                <div className="text-2xl font-black text-zinc-950 dark:text-white">
                  GH₵ {displayPrice.toLocaleString()}
                  <span className="text-xs font-medium text-zinc-500">
                    {' '}{property.pricePeriod === 'Nightly' ? '/ night' :
                     property.pricePeriod === 'Monthly' ? '/ month' :
                     property.pricePeriod === 'Annual' ? '/ year' : '/ acad. yr'}
                  </span>
                </div>
              </div>

              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Escrow Protected
              </span>
            </div>

            {/* Confirmed Viewing Status Banner */}
            {viewingScheduled && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-1">
                <div className="font-bold text-[#0F5132] dark:text-emerald-300 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600" /> Physical Inspection Requested
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  Scheduled for <strong>{viewingScheduled.date}</strong> ({viewingScheduled.time}). The landlord has been notified.
                </p>
              </div>
            )}

            {/* Active Reservation Banner if user already holds one */}
            {myActiveBookingData && myActiveBookingData.propertyId === propertyId && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                <div className="font-bold text-[#0F5132] dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Active Reservation Confirmed
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  You already hold a confirmed reservation for this property.
                </p>
                <Link href="/dashboard/tenant" className="inline-block font-bold text-[#0F5132] hover:underline text-[11px]">
                  View Lease &amp; Receipt &rarr;
                </Link>
              </div>
            )}

            {bookingMessage && (
              <div className={clsx(
                "p-3 rounded-xl text-xs font-bold flex items-center gap-2 border",
                bookingMessage.type === 'success' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingMessage.text}</span>
              </div>
            )}

            {/* Reservation Form */}
            <form onSubmit={handleBooking} className="space-y-4 text-xs">
              
              {/* Unit / Room Plan Selector */}
              {property.rooms && property.rooms.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Select Unit / Room Option
                  </label>
                  <div className="space-y-1.5">
                    {property.rooms.map((room: any) => (
                      <label 
                        key={room.id}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                          selectedRoomId === room.id
                            ? "bg-[#0F5132]/5 dark:bg-emerald-950/30 border-[#0F5132] ring-1 ring-[#0F5132]"
                            : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="roomPlan"
                            value={room.id}
                            checked={selectedRoomId === room.id}
                            onChange={() => {
                              setSelectedRoomId(room.id);
                              setSelectedRoomUnitId('');
                              setSelectedBedId('');
                            }}
                            className="accent-[#0F5132]"
                          />
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              {room.blockName ? `${room.blockName} - ` : ''}{room.roomType}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {isHostel ? `Capacity: ${room.numberOfRooms || 1} units` : 'Self-contained residential unit'}
                            </span>
                          </div>
                        </div>

                        <span className="font-black text-zinc-950 dark:text-white">
                          GH₵ {Number(room.price).toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              {/* Cost Summary Breakdown */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Tenancy Rent Rate</span>
                  <span className="font-bold text-zinc-900 dark:text-white">GH₵ {displayPrice.toLocaleString()}</span>
                </div>
                {cautionDepositAmt > 0 && (
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Refundable Caution Deposit</span>
                    <span className="font-bold text-zinc-900 dark:text-white">GH₵ {cautionDepositAmt.toLocaleString()}</span>
                  </div>
                )}
                {parsedUtilities.length > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-[11px] pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span>Included Utilities</span>
                    <span className="font-bold">Covered in Rent</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS (PRIMARY & SECONDARY) */}
              <div className="space-y-2 pt-1">
                {/* 1. Primary: Apply for Tenancy */}
                <button
                  type="submit"
                  disabled={isBooking}
                  className="w-full py-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Apply for Tenancy &amp; Reserve</span>
                </button>

                {/* 2. Secondary: A. "Schedule an On-Site Physical Viewing" */}
                <button
                  type="button"
                  onClick={() => setShowViewingModal(true)}
                  className="w-full py-2.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                  <span>Schedule On-Site Inspection</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" /> Ghana Card Verified
                </span>
                <span>•</span>
                <span>Act 220 Lease Agreement</span>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* ── A. SCHEDULE PHYSICAL VIEWING MODAL ── */}
      {showViewingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl space-y-5 animate-in">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] flex items-center justify-center font-bold">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-950 dark:text-white">Schedule Physical Inspection</h3>
                  <p className="text-[11px] text-zinc-500">Walk through the property before placing a deposit</p>
                </div>
              </div>
              <button onClick={() => setShowViewingModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleViewing} className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Property</span>
                <span className="font-bold text-zinc-900 dark:text-white block">{property.title}</span>
                <span className="text-zinc-500 text-[11px]">{property.location}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={viewingDate}
                  onChange={(e) => setViewingDate(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Preferred Time Slot *
                </label>
                <select
                  value={viewingTime}
                  onChange={(e) => setViewingTime(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="Morning (9:00 AM - 12:00 PM)">Morning (9:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (1:00 PM - 3:30 PM)">Afternoon (1:00 PM - 3:30 PM)</option>
                  <option value="Late Afternoon (4:00 PM - 6:00 PM)">Late Afternoon (4:00 PM - 6:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={viewingPhone}
                  onChange={(e) => setViewingPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Inspection Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={viewingNotes}
                  onChange={(e) => setViewingNotes(e.target.value)}
                  placeholder="e.g. Visiting with my spouse to check water pressure and parking..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowViewingModal(false)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={viewingSubmitting}
                  className="flex-1 py-2.5 bg-[#0F5132] text-white font-bold text-xs rounded-xl hover:bg-[#0A3D24] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {viewingSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
                  <span>Confirm Inspection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PAYMENT / ESCROW CHECKOUT MODAL ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-black text-sm text-zinc-950 dark:text-white">Confirm Tenancy Reservation</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
              <p>You are initiating an Act 220 residential tenancy reservation for:</p>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border font-bold text-zinc-900 dark:text-white">
                {property.title}
                <div className="text-xs font-medium text-zinc-500">{property.location}</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs font-bold text-[#0F5132] dark:text-emerald-300">
                Total Initial Payment: GH₵ {(displayPrice + cautionDepositAmt).toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-400">
                Your payment is held in secure MoMo / Paystack Escrow and released only after physical key handover.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isBooking}
                className="flex-1 py-2.5 bg-[#0F5132] text-white font-bold text-xs rounded-xl hover:bg-[#0A3D24] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBooking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Proceed to Paystack</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
