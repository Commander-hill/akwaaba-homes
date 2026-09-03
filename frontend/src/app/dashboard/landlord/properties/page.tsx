'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Plus, Edit, Trash2, MapPin, Building, AlertCircle, 
  CreditCard, CheckCircle, ExternalLink, Search, Users, Bed, 
  TrendingUp, ShieldCheck, Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

export default function LandlordPropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifyingPropId, setVerifyingPropId] = useState<string | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const requiredProfileFields = ['firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth', 'nationality', 'guardianName', 'guardianPhone'];
  const isProfileIncomplete = session && requiredProfileFields.some(field => !session[field] || !String(session[field]).trim());
  const isVerificationIncomplete = session && (!session.ghanaCardStatus || session.ghanaCardStatus === 'NOT_SUBMITTED');
  const isListingBlocked = isProfileIncomplete || isVerificationIncomplete;

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ['landlord', 'properties'],
    queryFn: async () => {
      const res = await api.get('/properties/landlord/mine');
      return res.data.data;
    },
    enabled: !!session
  });

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { data } = await api.delete(`/properties/${id}`);
      toast.success(data?.message || 'Property deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Failed to delete property:', error);
      toast.error(error.response?.data?.message || 'Failed to delete property');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const initPaymentMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const { data } = await api.post('/subscriptions/initialize', { propertyId });
      return data;
    },
    onSuccess: (data: any) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: any) => {
      setPaymentMsg({ text: error.response?.data?.message || 'Failed to start payment.', type: 'error' });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      const { data } = await api.post('/subscriptions/verify', { paymentReference: reference });
      return data;
    },
    onSuccess: (data: any) => {
      setPaymentMsg({ text: 'Listing published successfully!', type: 'success' });
      refetch();
      router.replace('/dashboard/landlord/properties');
    },
    onError: (error: any) => {
      setPaymentMsg({ text: error.response?.data?.message || 'Verification failed.', type: 'error' });
      router.replace('/dashboard/landlord/properties');
    }
  });

  if (typeof window !== 'undefined') {
    const verify = searchParams.get('verify');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    
    if (verify === 'true' && reference && !verifyPaymentMutation.isPending && !paymentMsg) {
      verifyPaymentMutation.mutate(reference);
    }
  }

  // Aggregate Portfolio Stats
  const portfolioStats = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return { total: 0, live: 0, drafts: 0, totalBeds: 0, grossValue: 0 };

    const total = properties.length;
    const live = properties.filter((p: any) => p.isAvailable).length;
    const drafts = total - live;

    let totalBeds = 0;
    let grossValue = 0;

    properties.forEach((p: any) => {
      const bedsInProp = p.rooms?.reduce((acc: number, r: any) => {
        const beds = parseInt(r.roomType?.split(' ')[0], 10) || 1;
        return acc + (Number(r.numberOfRooms || 0) * beds);
      }, 0) || 0;

      totalBeds += bedsInProp;
      grossValue += Number(p.price || 0);
    });

    return { total, live, drafts, totalBeds, grossValue };
  }, [properties]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];

    return properties.filter((p: any) => {
      if (statusFilter === 'ACTIVE' && !p.isAvailable) return false;
      if (statusFilter === 'DRAFT' && p.isAvailable) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchLoc = (p.location || '').toLowerCase().includes(q);
        return matchTitle || matchLoc;
      }
      return true;
    });
  }, [properties, statusFilter, searchQuery]);

  if (isLoading || sessionLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" /></div>;
  }

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* ── STICKY HEADER & PORTFOLIO SNAPSHOT ── */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Accommodation Portfolio</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage live campus listings, room floorplans, and publication statuses.</p>
          </div>
          
          <Link 
            href="/dashboard/landlord/new" 
            id="tour-add-property"
            className={clsx(
              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors shrink-0",
              isListingBlocked ? "bg-amber-600 hover:bg-amber-700" : "bg-[#0F5132] hover:bg-[#0A3D24]"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isListingBlocked ? '🔒 Add Property (Locked)' : 'List New Property'}</span>
          </Link>
        </div>

        {/* Executive Portfolio Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Properties</span>
              <Building className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-black text-zinc-950 dark:text-white">{portfolioStats.total}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Managed in portfolio</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live &amp; Visible</span>
              <CheckCircle className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <div className="text-xl font-black text-[#0F5132] dark:text-emerald-400">{portfolioStats.live}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Accepting student bookings</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Student Capacity</span>
              <Bed className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-black text-zinc-950 dark:text-white">{portfolioStats.totalBeds} Beds</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Total registered capacity</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Action Required</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">{portfolioStats.drafts}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Unpublished or pending renewal</div>
          </div>
        </div>
      </div>

      {isListingBlocked && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-600" /> Property Listing Creation Locked
          </div>
          <p className="leading-relaxed">
            Under Ghana Rent Act statutory policy, landlords must complete profile identification and submit Ghana Card KYC before listing new properties.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {isProfileIncomplete && (
              <Link href="/dashboard/profile" className="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold text-xs">
                Complete Account Profile
              </Link>
            )}
            {isVerificationIncomplete && (
              <Link href="/dashboard/verification" className="px-3 py-1 bg-[#0F5132] text-white rounded-lg font-bold text-xs">
                Submit Ghana Card KYC
              </Link>
            )}
          </div>
        </div>
      )}

      {paymentMsg && (
        <div className={clsx(
          "p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold border",
          paymentMsg.type === 'success' 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" 
            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
        )}>
          {paymentMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{paymentMsg.text}</span>
        </div>
      )}

      {/* ── TOOLBAR: SEARCH & STATUS FILTERS ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search properties by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] outline-none transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All (${portfolioStats.total})` },
            { id: 'ACTIVE', label: `Live on Campus (${portfolioStats.live})` },
            { id: 'DRAFT', label: `Drafts (${portfolioStats.drafts})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={clsx(
                "px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                statusFilter === tab.id
                  ? "bg-[#0F5132] text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PROPERTIES GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] space-y-3">
            <Building className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Matching Properties Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery ? 'Try modifying your search keywords or clear filters.' : 'You have not added any accommodations yet.'}
            </p>
            {!searchQuery && (
              <Link 
                href="/dashboard/landlord/new" 
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0A3D24] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> List Your First Property
              </Link>
            )}
          </div>
        ) : (
          filteredProperties.map((property: any) => {
            const totalBeds = property.rooms?.reduce((acc: number, r: any) => {
              const beds = parseInt(r.roomType?.split(' ')[0], 10) || 1;
              return acc + (Number(r.numberOfRooms || 0) * beds);
            }, 0) || 0;

            const roomConfigsCount = property.rooms?.length || 1;

            return (
              <div 
                key={property.id} 
                className="bg-white dark:bg-[#12151D] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group relative"
              >
                {/* Image Header with Badges */}
                <div className="h-44 overflow-hidden relative bg-zinc-100 dark:bg-zinc-800">
                  <img 
                    src={property.images?.[0] ? getImageUrl(property.images[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} 
                    alt={property.title} 
                    className={clsx(
                      "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
                      !property.isAvailable && "grayscale opacity-75"
                    )}
                  />
                  
                  {/* Status Badges Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {property.isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0F5132]/90 backdrop-blur-md text-white border border-emerald-500/40 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live on Campus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-600/90 backdrop-blur-md text-white border border-amber-400/40 shadow-xs">
                        <AlertCircle className="w-3 h-3" /> Unpublished / Draft
                      </span>
                    )}

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {property.type || 'Hostel'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-col flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1 group-hover:text-[#0F5132] transition-colors">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-zinc-500 text-xs mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-zinc-400" />
                      <span className="truncate">{property.location}</span>
                    </div>
                  </div>

                  {/* Operational Metrics Bar */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                      <Bed className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{totalBeds > 0 ? `${totalBeds} Total Beds` : '1 Unit'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                      <Building className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{roomConfigsCount} Room Type{roomConfigsCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Price & Action Row */}
                  <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Listing Rate</div>
                      <div className="font-black text-xs text-zinc-950 dark:text-white">
                        GH₵{property.price?.toLocaleString()}{' '}
                        <span className="text-[10px] font-medium text-zinc-500">
                          {property.pricePeriod === 'Nightly' ? '/night' :
                           property.pricePeriod === 'Monthly' ? '/mo' :
                           property.pricePeriod === 'Annual' ? '/yr' : '/acad. yr'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!property.isAvailable && (
                        <button
                          onClick={() => {
                            setVerifyingPropId(property.id);
                            initPaymentMutation.mutate(property.id);
                          }}
                          disabled={initPaymentMutation.isPending && verifyingPropId === property.id}
                          className="px-2.5 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Pay GHS 100/yr to list this property"
                        >
                          {initPaymentMutation.isPending && verifyingPropId === property.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3" /> Publish
                            </>
                          )}
                        </button>
                      )}

                      <Link 
                        href={`/properties/${property.id}`}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="View Public Page"
                        target="_blank"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      <Link 
                        href={`/dashboard/landlord/properties/${property.id}/edit`}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Edit Property"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>

                      <button 
                        onClick={() => setDeleteId(property.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete Property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteId === property.id && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-20 flex items-center justify-center p-4 text-center flex-col animate-in fade-in">
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                    <h4 className="text-white font-bold text-base mb-1">Delete Property?</h4>
                    <p className="text-zinc-300 text-xs mb-4">This action cannot be undone. Associated floorplan records will be purged.</p>
                    <div className="flex gap-2 w-full max-w-xs">
                      <button 
                        onClick={() => setDeleteId(null)} 
                        disabled={isDeleting}
                        className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleDelete(property.id)} 
                        disabled={isDeleting}
                        className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
