'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, MapPin, CheckCircle, Bed, ArrowLeft, Calendar, Home, Users, Star, Info, Flag, Send } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <Link href="/properties" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors w-fit font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-4 h-[400px]">
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
              <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">{property.title}</h1>
              <div className="text-right">
                {!selectedRoomId && <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Starting from</div>}
                <div className="text-3xl font-bold text-[var(--primary)]">GH₵{displayPrice}</div>
                <div className="text-sm text-[var(--muted-foreground)]">per academic year</div>
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
                  <span className="text-sm font-medium text-[var(--muted-foreground)]"> / {property.totalCapacity} rooms left</span>
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

            {/* Reputation Methodology transparency note */}
            <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-[var(--border)]">
              <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                <strong>How reviews work:</strong> Only tenants who have <strong>completed a verified stay</strong> at this property can submit a review. 
                One review is permitted per booking. Ratings are averaged from all eligible reviews to ensure fairness. 
                Disputed or flagged reviews are reviewed by administrators before they affect scores.
              </p>
            </div>

            {/* Review list */}
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

            {/* Write a Review — inline for eligible tenants */}
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

        {/* Right Col: Booking */}
        <div className="lg:col-span-1">
          <div className="glass-card p-8 rounded-3xl border border-[var(--border)] sticky top-24 shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Request Booking</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Select your dates to request this accommodation.</p>
            
            {bookingMessage && (
              <div className={`p-4 rounded-xl text-sm font-medium mb-6 border ${bookingMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-900/50' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:border-red-900/50'}`}>
                {bookingMessage.text}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-bold text-[var(--foreground)]">Select Room Type</label>
                {property.rooms?.map((room: any) => {
                  const genderBadge = room.gender === 'MALE'
                    ? { label: '♂ Male Only', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
                    : room.gender === 'FEMALE'
                    ? { label: '♀ Female Only', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' }
                    : { label: '🔀 Mixed', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };

                  return (
                    <label 
                      key={room.id}
                      className={`block relative p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedRoomId === room.id 
                          ? 'border-[var(--primary)] bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md ring-1 ring-[var(--primary)]' 
                          : 'border-[var(--border)] bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      } ${room.remainingCapacity === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <input 
                            type="radio" 
                            name="roomSelection" 
                            value={room.id}
                            disabled={room.remainingCapacity === 0}
                            checked={selectedRoomId === room.id}
                            onChange={(e) => setSelectedRoomId(e.target.value)}
                            className="w-4 h-4 mt-1 text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            {room.blockName && (
                              <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-0.5">
                                🏢 {room.blockName}
                              </div>
                            )}
                            <div className="font-bold text-[var(--foreground)]">{room.roomType}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${genderBadge.cls}`}>
                                {genderBadge.label}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)]">
                                {room.remainingCapacity === 0 
                                  ? <span className="text-red-500 font-semibold">Fully Booked</span> 
                                  : `${room.remainingCapacity} of ${room.totalCapacity} rooms left`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="font-extrabold text-[var(--foreground)] shrink-0 ml-2">GH₵{room.price}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Start Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="date" required min={new Date().toISOString().split('T')[0]} className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">End Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="date" required min={startDate || new Date().toISOString().split('T')[0]} className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isBooking || !selectedRoomId || (selectedRoom && selectedRoom.remainingCapacity === 0)}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : !selectedRoomId ? 'Select a Room' : (selectedRoom && selectedRoom.remainingCapacity === 0) ? 'Room Unavailable' : 'Request to Book'}
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
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all text-xs"
                  >
                    <Send className="w-4 h-4" /> Chat with Landlord
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h3 className="text-2xl font-black text-center mb-6">Complete Booking</h3>
            
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--muted-foreground)]">Property</span>
                <span className="font-bold text-right truncate w-48">{property.title}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--muted-foreground)]">Room</span>
                <span className="font-bold text-right truncate w-48">{selectedRoom?.roomType}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--muted-foreground)]">Check In</span>
                <span className="font-bold">{new Date(startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[var(--muted-foreground)]">Check Out</span>
                <span className="font-bold">{new Date(endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="font-bold text-lg">Total Due</span>
                <span className="text-2xl font-black text-[var(--primary)]">GHS {displayPrice}</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl mb-6 text-xs text-center font-medium">
              Your payment will be held securely. If the landlord rejects your request, you will receive an automatic full refund.
            </div>

            <button
              onClick={handleConfirmPayment}
              className="w-full flex justify-center items-center gap-2 py-4 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-[var(--primary)] to-indigo-600 hover:opacity-90 transition-all shadow-xl shadow-[var(--primary)]/25"
            >
              Pay & Request Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
