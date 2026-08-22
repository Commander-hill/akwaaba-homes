'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { Loader2, Building, CheckCircle, XCircle, MapPin, DollarSign, Clock } from 'lucide-react';

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const res = await api.get('/admin/properties');
      return res.data;
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, approvalStatus }: { id: string, approvalStatus: string }) => {
      await api.put(`/admin/properties/${id}/status`, { approvalStatus });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-properties'] }),
    onSettled: () => setProcessingId(null)
  });

  const handleStatusUpdate = (id: string, approvalStatus: string) => {
    setProcessingId(id);
    statusMutation.mutate({ id, approvalStatus });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Property Approvals</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Review new listings and enforce quality standards before they go live.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <Building className="w-8 h-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties?.map((property: any) => (
          <div key={property.id} className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col relative group">
            
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 ${
                property.approvalStatus === 'APPROVED' ? 'bg-emerald-500 text-white' :
                property.approvalStatus === 'PENDING' ? 'bg-amber-500 text-white' :
                'bg-red-500 text-white'
              }`}>
                {property.approvalStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                {property.approvalStatus}
              </span>
              {!property.isAvailable && (
                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                  HIDDEN
                </span>
              )}
            </div>

            <div className="h-48 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
              {property.images && property.images.length > 0 ? (
                <img src={getImageUrl(property.images[0])} alt={property.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
              )}
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-bold text-lg text-[var(--foreground)] line-clamp-1">{property.title}</h3>
              
              <div className="flex items-center text-[var(--muted-foreground)] text-sm mb-2 mt-1">
                <MapPin className="w-4 h-4 mr-1 shrink-0 text-[var(--primary)]" />
                <span className="truncate">{property.location}</span>
              </div>
              
              <div className="flex items-center text-[var(--muted-foreground)] text-sm mb-4">
                <DollarSign className="w-4 h-4 mr-1 shrink-0 text-emerald-500" />
                <span className="font-bold text-[var(--foreground)]">GH₵ {property.price.toLocaleString()} <span className="font-normal text-xs">/yr</span></span>
              </div>

              <div className="text-xs text-[var(--muted-foreground)] mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-[var(--border)]">
                <div className="font-bold text-[var(--foreground)] mb-1">Landlord Details</div>
                {property.landlord.firstName} {property.landlord.lastName}<br/>
                {property.landlord.email}
              </div>
              
              <div className="mt-auto pt-4 border-t border-[var(--border)] flex gap-2">
                {property.approvalStatus !== 'APPROVED' && (
                  <button 
                    onClick={() => handleStatusUpdate(property.id, 'APPROVED')}
                    disabled={processingId === property.id}
                    className="flex-1 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl text-sm font-bold transition-colors flex justify-center items-center gap-1"
                  >
                    {processingId === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Approve</>}
                  </button>
                )}
                {property.approvalStatus !== 'REJECTED' && (
                  <button 
                    onClick={() => handleStatusUpdate(property.id, 'REJECTED')}
                    disabled={processingId === property.id}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-sm font-bold transition-colors flex justify-center items-center gap-1"
                  >
                    {processingId === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {properties?.length === 0 && (
          <div className="col-span-full p-12 text-center text-[var(--muted-foreground)] border border-dashed rounded-3xl">
            No properties found in the system.
          </div>
        )}
      </div>
    </div>
  );
}
