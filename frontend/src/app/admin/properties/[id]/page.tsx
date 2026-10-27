'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Building,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Mail,
  ZoomIn,
  Loader2,
  AlertCircle,
  Camera,
  MapPin,
  ExternalLink,
  Bed,
  Bath,
  Info,
  ShieldCheck,
  DoorOpen,
  Check,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Single-entity lookup from backend
  const { data: property, isLoading, error } = useQuery({
    queryKey: ['admin-property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/admin/properties/${propertyId}`);
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ approvalStatus, rejectionReason }: { approvalStatus: string; rejectionReason?: string }) => {
      const res = await api.put(`/admin/properties/${propertyId}/status`, { approvalStatus, rejectionReason });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.approvalStatus === 'APPROVED'
          ? 'Property listing approved and published'
          : 'Property approval status updated'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update property status');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Loading comprehensive property inspection records...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Listing Not Located</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested property record could not be found or has been decommissioned.
        </p>
        <Link
          href="/admin/properties"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Properties Directory
        </Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(property.images) ? property.images : [];
  const amenities: string[] = Array.isArray(property.amenities) ? property.amenities : [];
  const houseRules: string[] = Array.isArray(property.rules) ? property.rules : [];
  const rooms: any[] = Array.isArray(property.rooms) ? property.rooms : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={property.title}
        subtitle={`${property.type || 'Property'} • ${property.location || 'Location unlisted'}`}
        badge={<AdminStatusBadge status={property.approvalStatus || 'PENDING'} />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Properties', href: '/admin/properties' },
          { label: property.title }
        ]}
        backUrl="/admin/properties"
        backLabel="Back to Properties"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${property.id}`}
              target="_blank"
              className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public View
            </Link>
          </div>
        }
      />

      {/* Main 2-Column Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media, Rooms & Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photo Gallery Grid */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Property Media Inspection ({images.length} Photos)
              </h3>
              <span className="text-[11px] text-zinc-400 font-medium">Click to inspect full resolution</span>
            </div>

            {images.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No photos uploaded for this listing
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(getImageUrl(imgUrl))}
                    className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer h-32 flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Property image ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Physical Attributes */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Pricing Structure & Spatial Configuration
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Base Rent Rate
                </span>
                <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  GH₵ {Number(property.price || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  /{property.pricePeriod ? property.pricePeriod.toLowerCase().replace('academic year', 'yr') : 'yr'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Caution Deposit
                </span>
                <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                  GH₵ {Number(property.cautionDeposit || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Refundable deposit</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Bedrooms
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-zinc-400" />
                  {property.bedrooms || 1} Rooms
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Bathrooms
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-zinc-400" />
                  {property.bathrooms || 1} Baths
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Physical Address & Location
              </span>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{property.address || property.location || 'Accra, Ghana'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Listing Description
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                {property.description || 'No description provided by host.'}
              </p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Included Amenities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rooms and Units Hierarchy (if defined) */}
          {rooms.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-emerald-600" />
                Room & Unit Inventory Breakdown ({rooms.length} Room Types)
              </h3>

              <div className="space-y-3">
                {rooms.map((room: any) => (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white">
                        {room.name || 'Room Configuration'}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        GH₵ {Number(room.price || property.price).toLocaleString()}
                      </span>
                    </div>
                    {room.roomUnits && room.roomUnits.length > 0 && (
                      <div className="text-[11px] text-zinc-500">
                        {room.roomUnits.length} Units registered ({room.roomUnits.filter((u: any) => u.isOccupied).length} occupied)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Moderation & Landlord Accreditation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Adjudication Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Listing Moderation Adjudication
            </h3>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Approving publishes this listing directly to the public marketplace and permits prospective tenants to submit booking requests.
            </p>

            <div className="space-y-2.5">
              {property.approvalStatus !== 'APPROVED' && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ approvalStatus: 'APPROVED' })}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve & Publish to Marketplace
                </button>
              )}

              {property.approvalStatus !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => setRejectDialogOpen(true)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject Listing
                </button>
              )}

              {property.approvalStatus !== 'PENDING' && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ approvalStatus: 'PENDING' })}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Return to Pending Moderation
                </button>
              )}
            </div>
          </div>

          {/* Landlord Accreditation */}
          {property.landlord && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  Landlord Accreditation
                </h3>
                <Link
                  href={`/admin/landlords/${property.landlord.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Profile
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {property.landlord.firstName} {property.landlord.lastName}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    property.landlord.isVerifiedLandlord
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {property.landlord.isVerifiedLandlord ? '✓ Verified Host' : 'Unverified Host'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {property.landlord.email} • {property.landlord.phoneNumber || 'No phone'}
                </div>
              </div>
            </div>
          )}

          {/* Statutory Verification Notes */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-950 dark:text-emerald-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Quality Assurance Checklist:</strong> Confirm photos are genuine and free of watermarks, caution deposit does not violate statutory limits, and digital location is pinpointed.
            </div>
          </div>
        </div>
      </div>

      {/* Audited Rejection Dialog */}
      <AdminConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        title="Reject Listing"
        description={`Provide the statutory or quality compliance reason for rejecting "${property.title}". The landlord will receive this notice in-app.`}
        confirmLabel="Reject Listing"
        confirmVariant="danger"
        requireReason={true}
        reasonLabel="Audited Rejection Explanation"
        reasonPlaceholder="e.g. The listing photos are too low resolution, or the advance rent requested violates platform rental policies."
        onConfirm={async (reason) => {
          await updateStatusMutation.mutateAsync({
            approvalStatus: 'REJECTED',
            rejectionReason: reason
          });
        }}
      />

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-bold text-sm">Property Inspection Photo</h3>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
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
