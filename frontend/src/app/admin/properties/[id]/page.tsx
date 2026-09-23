'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Building,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  ShieldCheck,
  Check,
  ZoomIn,
  Loader2,
  AlertCircle,
  Camera,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

export default function AdminPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Fetch properties to locate this listing
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const res = await api.get('/admin/properties');
      return res.data;
    }
  });

  const property = (properties as any[]).find((p: any) => p.id === propertyId);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, approvalStatus }: { id: string; approvalStatus: string }) => {
      const res = await api.put(`/admin/properties/${id}/status`, { approvalStatus });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Property approval status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update property status');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Loading property compliance records...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Listing Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested property could not be located in the current catalog index.
        </p>
        <Link
          href="/admin/properties"
          className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold transition"
        >
          Return to Properties Directory
        </Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(property.images) ? property.images : [];
  const amenities: string[] = Array.isArray(property.amenities) ? property.amenities : [];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-in">
      {/* ── Breadcrumbs & Navigation ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/admin/dashboard" className="hover:text-emerald-600 transition">
            Admin Console
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/admin/properties" className="hover:text-emerald-600 transition">
            Property Approvals
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">Listing Audit #{property.id.slice(0, 8)}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Listing Quality Audit
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                property.approvalStatus === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : property.approvalStatus === 'PENDING'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
              }`}>
                {property.approvalStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {property.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/properties/${property.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public View
            </Link>
            <Link
              href="/admin/properties"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media & Specifications (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photo Gallery Grid */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Property Photographic Inspection ({images.length} Photos)
              </h2>
              <span className="text-[11px] text-slate-400 font-semibold">Tap to zoom</span>
            </div>

            {images.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                No images uploaded for this listing
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(getImageUrl(imgUrl))}
                    className="relative group rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 cursor-pointer h-36 flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Property image ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Physical Attributes */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-5">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Financial Rates & Physical Details
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Monthly Rent
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  GHS {property.price?.toLocaleString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Caution Deposit
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  GHS {(property.cautionDeposit || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Bedrooms
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-slate-400" />
                  {property.bedrooms || 1}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Bathrooms
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-slate-400" />
                  {property.bathrooms || 1}
                </span>
              </div>
            </div>

            {/* Location & GPS */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Location & Digital Address
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{property.address || property.location || 'Accra, Ghana'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Published Description
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Included Amenities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Landlord Context & Approval Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Decision Action Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              Listing Approval Action
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Approving publishes this listing directly to the public directory and enables tenants to book or tour the premises.
            </p>

            <div className="space-y-2.5 pt-2">
              {property.approvalStatus !== 'APPROVED' && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: property.id, approvalStatus: 'APPROVED' })}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve & Publish to Directory
                </button>
              )}

              {property.approvalStatus !== 'REJECTED' && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: property.id, approvalStatus: 'REJECTED' })}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Listing
                </button>
              )}

              {property.approvalStatus !== 'PENDING' && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: property.id, approvalStatus: 'PENDING' })}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Return to Pending Audit
                </button>
              )}
            </div>
          </div>

          {/* Landlord Accreditation */}
          {property.landlord && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" /> Landlord Accreditation
              </h3>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {property.landlord.firstName} {property.landlord.lastName}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{property.landlord.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statutory Verification Notes */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-950 dark:text-emerald-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Quality Assurance Checklist:</strong> Verify that photos match reality, caution deposit does not exceed statutory limits, and utility arrangements are transparently specified.
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-sm">Property Inspection Photo</h3>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImage} alt="Property Zoom" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
