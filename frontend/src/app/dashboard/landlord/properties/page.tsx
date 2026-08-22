'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Plus, Edit, Trash2, MapPin, Building, AlertCircle, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';

export default function LandlordPropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifyingPropId, setVerifyingPropId] = useState<string | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: async () => {
      const res = await api.get('/properties/landlord/mine');
      return res.data.data;
    },
    enabled: !!session
  });

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/properties/${id}`);
      refetch();
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to delete property');
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
    onSuccess: (data) => {
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
    onSuccess: (data) => {
      setPaymentMsg({ text: 'Listing published successfully!', type: 'success' });
      refetch();
      router.replace('/dashboard/landlord/properties');
    },
    onError: (error: any) => {
      setPaymentMsg({ text: error.response?.data?.message || 'Verification failed.', type: 'error' });
      router.replace('/dashboard/landlord/properties');
    }
  });

  // Check URL params for verification
  if (typeof window !== 'undefined') {
    const verify = searchParams.get('verify');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    
    if (verify === 'true' && reference && !verifyPaymentMutation.isPending && !paymentMsg) {
      verifyPaymentMutation.mutate(reference);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">My Properties</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Manage your listings, update details, or remove unavailable properties.</p>
        </div>
        <Link 
          href="/dashboard/landlord/new" 
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Property
        </Link>
      </div>

      {paymentMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${paymentMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {paymentMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{paymentMsg.text}</span>
        </div>
      )}

      {verifyPaymentMutation.isPending && (
        <div className="p-8 glass-card rounded-2xl flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--foreground)] font-bold">Verifying your payment...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties?.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center rounded-3xl border border-[var(--border)]">
            <Building className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No Properties Listed</h3>
            <p className="text-[var(--muted-foreground)] mb-6">You haven't listed any properties yet. Subscribe and start adding properties to receive bookings.</p>
            <Link 
              href="/dashboard/landlord/new" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Your First Property
            </Link>
          </div>
        ) : (
          properties?.map((property: any) => (
            <div key={property.id} className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] flex flex-col hover:shadow-md transition-shadow group relative">
              
              {!property.isAvailable && (
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <AlertCircle className="w-3 h-3" /> Unavailable
                </div>
              )}

              <div className="h-48 overflow-hidden relative">
                <img 
                  src={property.images[0] ? getImageUrl(property.images[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} 
                  alt={property.title} 
                  className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${!property.isAvailable ? 'grayscale opacity-70' : ''}`}
                />
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-[var(--foreground)] line-clamp-1">{property.title}</h3>
                </div>
                <div className="flex items-center text-[var(--muted-foreground)] text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-1 shrink-0 text-[var(--primary)]" />
                  <span className="truncate">{property.location}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="font-bold text-[var(--primary)]">
                    GH₵{property.price.toLocaleString()} <span className="text-xs text-[var(--muted-foreground)] font-normal">/yr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!property.isAvailable && (
                      <button
                        onClick={() => {
                          setVerifyingPropId(property.id);
                          initPaymentMutation.mutate(property.id);
                        }}
                        disabled={initPaymentMutation.isPending && verifyingPropId === property.id}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm mr-1"
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
                      href={`/dashboard/landlord/properties/${property.id}/edit`}
                      className="p-2 text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                      title="Edit Property"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => setDeleteId(property.id)}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Property"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {deleteId === property.id && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex items-center justify-center p-4 text-center flex-col animate-in fade-in">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <h4 className="text-white font-bold text-lg mb-2">Delete Property?</h4>
                  <p className="text-slate-300 text-sm mb-6">This action cannot be undone. All associated bookings will be affected.</p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setDeleteId(null)} 
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleDelete(property.id)} 
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex justify-center items-center gap-2"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
