'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, Lock, Building2, MapPin, UploadCloud, Info, Video, Image as ImageIcon, X, Plus, Trash2, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';
import { getImageUrl } from '@/lib/utils';

interface RoomInput {
  id: string;
  blockName: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  roomType: string;
  numberOfRooms: number | string;
  price: string;
}

const PRESET_AMENITY_CATEGORIES = [
  {
    category: '⚡ 24/7 Power & Utilities',
    items: [
      { name: 'Standby Generator', icon: '⚡' },
      { name: 'Solar Inverter / Solar Power', icon: '☀️' },
      { name: '24/7 Water (Borehole / Polytank)', icon: '💧' },
      { name: 'Prepaid Electricity Meter', icon: '🔌' },
      { name: 'Water Heater', icon: '🚿' }
    ]
  },
  {
    category: '🛡️ Security & Access',
    items: [
      { name: '24/7 Uniformed Security Guard', icon: '💂' },
      { name: 'CCTV Surveillance Cameras', icon: '📹' },
      { name: 'Electric Wall Fence', icon: '⚡' },
      { name: 'Gated Compound', icon: '🚪' },
      { name: 'Smart Keycard / Biometric Gate', icon: '🔑' }
    ]
  },
  {
    category: '🚗 Parking & Access',
    items: [
      { name: 'Dedicated Garage Parking', icon: '🚗' },
      { name: 'Underground Parking', icon: '🅿️' },
      { name: 'Paved Compound Parking', icon: '🚙' },
      { name: 'Free Campus Shuttle Service', icon: '🚌' }
    ]
  },
  {
    category: '❄️ Climate & Comfort',
    items: [
      { name: 'Air Conditioning (AC)', icon: '❄️' },
      { name: 'Ceiling Fan', icon: '🌀' },
      { name: 'Private Balcony', icon: '🌅' },
      { name: 'En-Suite Bathroom', icon: '🚽' }
    ]
  },
  {
    category: '📶 Internet & Study',
    items: [
      { name: 'High-Speed Fiber WiFi', icon: '📶' },
      { name: 'Study Desk & Chair', icon: '🪑' },
      { name: 'Dedicated Study Lounge', icon: '📚' }
    ]
  },
  {
    category: '🏊 Lifestyle & Wellness',
    items: [
      { name: 'Swimming Pool', icon: '🏊' },
      { name: 'Fitness Gym', icon: '🏋️' },
      { name: 'Garden / Courtyard', icon: '🌿' },
      { name: 'Fitted Kitchenette / Kitchen', icon: '🍳' },
      { name: 'Laundry Service / Washing Machine', icon: '🧺' }
    ]
  }
];

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    type: 'Hostel',
    targetAudience: 'Open to All',
    furnishing: 'Unfurnished',
    pricePeriod: 'Academic Year',
    gateLockTime: 'No Curfew / 24/7 Access',
    visitorPolicy: 'Day visitors allowed until 8 PM',
    quietHours: 'From 10:00 PM',
    paymentSchedule: 'Full Academic Year',
    cautionDeposit: '',
    includedUtilities: ['Water Bill Included', 'Garbage/Trash Service Included'] as string[],
    description: '',
    location: '',
    amenities: '',
    latitude: null as number | null,
    longitude: null as number | null,
    videoUrl: '',
    images: [] as string[],
  });

  const [rooms, setRooms] = useState<RoomInput[]>([
    { id: Date.now().toString(), blockName: '', gender: 'MIXED', roomType: '1 in a room', numberOfRooms: 1, price: '' }
  ]);

  const [fieldErrors, setFieldErrors] = useState<{ title?: boolean; location?: boolean; description?: boolean }>({});
  const [roomErrors, setRoomErrors] = useState<{ [roomId: string]: { numberOfRooms?: boolean; price?: boolean } }>({});

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [error, setError] = useState('');

  const handleLocationPin = async (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.quarter ||
          addr.village ||
          addr.town ||
          addr.city_district ||
          addr.city ||
          addr.county ||
          '';

        const city = addr.city || addr.town || addr.state || '';

        let locationName = area;
        if (area && city && area.toLowerCase() !== city.toLowerCase()) {
          locationName = `${area}, ${city}`;
        } else if (!area && city) {
          locationName = city;
        }

        if (locationName) {
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            location: locationName
          }));
          setFieldErrors(prev => ({ ...prev, location: false }));
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    }
  });

  const requiredProfileFields = ['firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth', 'nationality', 'guardianName', 'guardianPhone'];
  const isProfileIncomplete = session && requiredProfileFields.some(field => !session[field] || !String(session[field]).trim());
  const isVerificationIncomplete = session && (!session.ghanaCardStatus || session.ghanaCardStatus === 'NOT_SUBMITTED');
  const isListingBlocked = isProfileIncomplete || isVerificationIncomplete;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        rooms: rooms.map(r => ({
          blockName: r.blockName || null,
          gender: r.gender,
          roomType: r.roomType,
          numberOfRooms: Number(r.numberOfRooms),
          price: r.price
        })),
        amenities: data.amenities.split(',').map((a: string) => a.trim()).filter(Boolean),
        images: data.images.length > 0 ? data.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop']
      };
      const response = await api.post('/properties', formattedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      router.push('/dashboard/landlord/properties');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to list property');
    }
  });

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('Video exceeds 50MB limit.');
      return;
    }

    setVideoFile(file);
    setVideoUploading(true);
    setError('');

    try {
      const uploadData = new FormData();
      uploadData.append('video', file);

      const res = await api.post('/upload/video', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData(prev => ({ ...prev, videoUrl: res.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload video');
      setVideoFile(null);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length + formData.images.length > 5) {
      setError('You can only upload a maximum of 5 images per property.');
      return;
    }

    setImagesUploading(true);
    setError('');

    try {
      const uploadData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadData.append('images', files[i]);
      }

      const res = await api.post('/upload/images', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData(prev => ({ ...prev, images: [...prev.images, ...res.data.urls] }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload images');
    } finally {
      setImagesUploading(false);
    }
  };

  const handleAddRoom = () => {
    setRooms(prev => [...prev, { id: Date.now().toString(), blockName: '', gender: 'MIXED', roomType: '1 in a room', numberOfRooms: 1, price: '' }]);
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    if (roomErrors[id]) {
      setRoomErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleRoomChange = (id: string, field: keyof RoomInput, value: any) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    if (roomErrors[id]) {
      setRoomErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const totalCapacity = rooms.reduce((acc, r) => {
    const beds = parseInt(r.roomType.split(' ')[0], 10) || 1;
    const qty = Number(r.numberOfRooms) || 0;
    return acc + (qty * beds);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setRoomErrors({});

    // 1. Top-Level Field Validation
    const newFieldErrors: { title?: boolean; location?: boolean; description?: boolean } = {};
    if (!formData.title?.trim()) newFieldErrors.title = true;
    if (!formData.location?.trim()) newFieldErrors.location = true;
    if (!formData.description?.trim()) newFieldErrors.description = true;

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      const missingLabels = [];
      if (newFieldErrors.title) missingLabels.push('Property Title');
      if (newFieldErrors.location) missingLabels.push('Location Name');
      if (newFieldErrors.description) missingLabels.push('Description');
      setError(`Please fill in all required property fields: ${missingLabels.join(', ')}.`);
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    if (rooms.length === 0) {
      setError('You must add at least one room configuration.');
      return;
    }

    // 2. Precise Per-Room Configuration Validation
    const newRoomErrors: { [roomId: string]: { numberOfRooms?: boolean; price?: boolean } } = {};
    let firstInvalidRoomId: string | null = null;
    let firstInvalidSummary = '';

    rooms.forEach((room, index) => {
      const isMissingRooms = !room.numberOfRooms || Number(room.numberOfRooms) <= 0;
      const isMissingPrice = !room.price || String(room.price).trim() === '' || Number(room.price) <= 0;

      if (isMissingRooms || isMissingPrice) {
        newRoomErrors[room.id] = {
          numberOfRooms: isMissingRooms,
          price: isMissingPrice,
        };

        if (!firstInvalidRoomId) {
          firstInvalidRoomId = room.id;
          const blockLabel = room.blockName?.trim() ? `"${room.blockName}"` : `Configuration #${index + 1}`;
          const missingItems = [];
          if (isMissingRooms) missingItems.push('Number of Rooms');
          if (isMissingPrice) missingItems.push('Price/Year');
          firstInvalidSummary = `Room ${blockLabel} is incomplete: Please enter ${missingItems.join(' and ')}.`;
        }
      }
    });

    if (firstInvalidRoomId) {
      setRoomErrors(newRoomErrors);
      setError(`⚠️ Incomplete Room Configuration: ${firstInvalidSummary}`);

      // Smooth scroll to the specific incomplete room block
      setTimeout(() => {
        const targetEl = document.getElementById(`room-config-${firstInvalidRoomId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    if (videoUploading || imagesUploading) {
      setError('Please wait for media to finish uploading');
      return;
    }

    createMutation.mutate(formData);
  };

  if (sessionLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  if (isListingBlocked) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 glass-card rounded-3xl border border-red-200 dark:border-red-900/50 shadow-2xl text-center space-y-6 animate-in">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight">🔒 Property Listing Page Locked</h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xl mx-auto">
            Under Akwaaba Homes platform security and verification policy, landlords must fill in all details on their profile page and submit their Ghana Card for identity verification before creating property listings.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-left text-xs space-y-2">
          <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600" /> Action Required Before Listing Properties:
          </div>
          <ul className="list-disc list-inside space-y-1 font-medium text-amber-900 dark:text-amber-200">
            {isProfileIncomplete && (
              <li>Complete all required profile details (First & Last Name, Phone, Gender, DOB, Nationality, Emergency Contact).</li>
            )}
            {isVerificationIncomplete && (
              <li>Submit your Ghana Card details on the Verification page for KYC validation.</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isProfileIncomplete && (
            <Link
              href="/dashboard/profile"
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              👤 Complete Profile First
            </Link>
          )}
          {isVerificationIncomplete && (
            <Link
              href="/dashboard/verification"
              className="w-full sm:w-auto px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              🆔 Submit Ghana Card Verification
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60 mb-6 shadow-xs">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">List New Property</h1>
        <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">Create a stunning listing to attract the best tenants.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 p-4 rounded-xl text-sm font-bold border border-red-200 dark:border-red-900/50 flex items-start gap-3 shadow-md animate-in fade-in">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          {/* Property Title */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between items-center">
              <span>Property Title *</span>
              {fieldErrors.title && <span className="text-xs font-bold text-red-500">⚠ Title is required</span>}
            </label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${fieldErrors.title ? 'text-red-500' : 'text-slate-400'}`} />
              <input 
                type="text" 
                value={formData.title}
                onChange={e => {
                  setFormData({...formData, title: e.target.value});
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: false }));
                }}
                placeholder="e.g. Luxury Single Room at Evandy"
                className={`w-full bg-transparent border rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.title 
                    ? 'border-red-500 focus:ring-red-500/30 bg-red-50/20' 
                    : 'border-[var(--input)] focus:ring-[var(--ring)]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)]">Property Type *</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              >
                <option value="Hostel">Hostel</option>
                <option value="Homestay">Homestay</option>
                <option value="Apartment">Apartment / Flat</option>
                <option value="Studio">Studio Apartment</option>
                <option value="Residential House">Residential House</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Guest House">Guest House / Villa</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <span>👥</span> Target Tenant
              </label>
              <select 
                value={formData.targetAudience}
                onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              >
                <option value="Open to All">🌐 Open to All</option>
                <option value="Students & Young Professionals">🎓 Students & Young Professionals</option>
                <option value="Working Professionals">💼 Working Professionals</option>
                <option value="Families">👨‍👩‍👧‍👦 Families</option>
                <option value="Short-Term Vacationers">🏖️ Short-Term Vacationers</option>
              </select>
            </div>

            {/* Furnishing Status */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <span>🛋️</span> Furnishing
              </label>
              <select 
                value={formData.furnishing}
                onChange={e => setFormData({...formData, furnishing: e.target.value})}
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              >
                <option value="Fully Furnished">✨ Fully Furnished</option>
                <option value="Semi-Furnished">🛋️ Semi-Furnished</option>
                <option value="Unfurnished">📦 Unfurnished</option>
              </select>
            </div>

            {/* Pricing / Rental Period */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <span>📅</span> Pricing Period *
              </label>
              <select 
                value={formData.pricePeriod}
                onChange={e => setFormData({...formData, pricePeriod: e.target.value})}
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              >
                <option value="Academic Year">🎓 Academic Year (2 Sems)</option>
                <option value="Monthly">🗓️ Monthly (Long-term)</option>
                <option value="Annual">🏡 Annual (Full Year)</option>
                <option value="Nightly">🌙 Nightly (Short-stay)</option>
              </select>
            </div>
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between items-center">
              <span>Location Name *</span>
              {fieldErrors.location ? (
                <span className="text-xs font-bold text-red-500">⚠ Location is required</span>
              ) : isGeocoding ? (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Auto-detecting area...
                </span>
              ) : null}
            </label>
            <div className="relative">
              <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${fieldErrors.location ? 'text-red-500' : 'text-slate-400'}`} />
              <input 
                type="text" 
                value={formData.location}
                onChange={e => {
                  setFormData({...formData, location: e.target.value});
                  if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: false }));
                }}
                placeholder="e.g. Ayeduase / East Legon / Cape Coast"
                className={`w-full bg-transparent border rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.location 
                    ? 'border-red-500 focus:ring-red-500/30 bg-red-50/20' 
                    : 'border-[var(--input)] focus:ring-[var(--ring)]'
                }`}
              />
            </div>
          </div>

          {/* Room Configurations Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">Room Configurations *</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Add the types of rooms available in this property.</p>
              </div>
              <button 
                type="button" 
                onClick={handleAddRoom}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Room Type
              </button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => {
                const hasRoomError = Boolean(roomErrors[room.id]);
                const numRoomsErr = roomErrors[room.id]?.numberOfRooms;
                const priceErr = roomErrors[room.id]?.price;

                const missingFieldNames = [];
                if (numRoomsErr) missingFieldNames.push('Number of Rooms');
                if (priceErr) missingFieldNames.push('Price/Year');

                return (
                  <div 
                    key={room.id} 
                    id={`room-config-${room.id}`}
                    className={`p-5 rounded-xl transition-all duration-300 relative ${
                      hasRoomError 
                        ? 'border-2 border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-lg shadow-red-500/10 ring-2 ring-red-500/20' 
                        : 'border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/20'
                    }`}
                  >
                    {hasRoomError && (
                      <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-black flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Incomplete Configuration #{index + 1} ({room.blockName || 'Untitled Block'}): Please fill in {missingFieldNames.join(' and ')}.</span>
                      </div>
                    )}

                    {rooms.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRoom(room.id)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {/* Block Name */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <span>🏢</span> Block / Wing Name
                        </label>
                        <input
                          type="text"
                          value={room.blockName}
                          onChange={e => handleRoomChange(room.id, 'blockName', e.target.value)}
                          placeholder="e.g. Dakar Block A / Female Wing"
                          className="w-full bg-transparent border border-[var(--input)] rounded-lg py-2 px-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                        />
                      </div>
                      {/* Gender Designation */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <span>⚧</span> Gender Designation *
                        </label>
                        <select
                          value={room.gender}
                          onChange={e => handleRoomChange(room.id, 'gender', e.target.value)}
                          className="w-full bg-transparent border border-[var(--input)] rounded-lg py-2 px-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                        >
                          <option value="MIXED">🔀 Mixed (Open to All)</option>
                          <option value="MALE">♂ Male Only</option>
                          <option value="FEMALE">♀ Female Only</option>
                        </select>
                        {room.gender !== 'MIXED' && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ⚠ Only {room.gender === 'MALE' ? 'male' : 'female'} students can book this block.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mr-8">
                      {/* Room Type */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--foreground)]">Room Type *</label>
                        <select 
                          value={room.roomType}
                          onChange={e => handleRoomChange(room.id, 'roomType', e.target.value)}
                          className="w-full bg-transparent border border-[var(--input)] rounded-lg py-2 px-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                        >
                          <option value="1 in a room">1 in a room</option>
                          <option value="2 in a room">2 in a room</option>
                          <option value="3 in a room">3 in a room</option>
                          <option value="4 in a room">4 in a room</option>
                        </select>
                      </div>
                      
                      {/* Number of Rooms */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--foreground)] flex justify-between items-center">
                          <span>Number of Rooms *</span>
                          {numRoomsErr && <span className="text-[10px] font-bold text-red-500">⚠ Required</span>}
                        </label>
                        <input 
                          type="number" 
                          min="1"
                          value={room.numberOfRooms}
                          onChange={e => handleRoomChange(room.id, 'numberOfRooms', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                          placeholder="Qty"
                          className={`w-full bg-transparent border rounded-lg py-2 px-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 transition-all ${
                            numRoomsErr 
                              ? 'border-red-500 focus:ring-red-500/30 bg-red-50/50 dark:bg-red-900/20' 
                              : 'border-[var(--input)] focus:ring-[var(--ring)]'
                          }`}
                        />
                        {numRoomsErr && <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">⚠ Enter room quantity</p>}
                      </div>
                      
                      {/* Price / Period (GHS) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--foreground)] flex justify-between items-center">
                          <span>Price / {formData.pricePeriod === 'Nightly' ? 'Night' : formData.pricePeriod === 'Monthly' ? 'Month' : formData.pricePeriod === 'Annual' ? 'Year' : 'Acad. Year'} (GHS) *</span>
                          {priceErr && <span className="text-[10px] font-bold text-red-500">⚠ Required</span>}
                        </label>
                        <div className="relative">
                          <DollarSign className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${priceErr ? 'text-red-500' : 'text-slate-400'}`} />
                          <input 
                            type="number" 
                            min="1"
                            value={room.price}
                            onChange={e => handleRoomChange(room.id, 'price', e.target.value)}
                            placeholder="Amount"
                            className={`w-full bg-transparent border rounded-lg py-2 pl-8 pr-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 transition-all ${
                              priceErr 
                                ? 'border-red-500 focus:ring-red-500/30 bg-red-50/50 dark:bg-red-900/20' 
                                : 'border-[var(--input)] focus:ring-[var(--ring)]'
                            }`}
                          />
                        </div>
                        {priceErr && <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">⚠ Enter room price</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-[var(--border)] rounded-xl p-4 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total Capacity</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Total individual beds this property can accommodate</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    <span className="font-semibold text-[var(--foreground)]">{rooms.reduce((a, r) => a + (Number(r.numberOfRooms) || 0), 0)}</span> physical rooms → <span className="font-semibold text-[var(--foreground)]">{totalCapacity}</span> beds
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-[var(--primary)]">{totalCapacity}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">beds</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between items-center">
              <span>Pinpoint on Map *</span>
              {isGeocoding ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Resolving area name...
                </span>
              ) : formData.latitude && formData.longitude ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                  ✓ Location Selected ({formData.location || `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}`})
                </span>
              ) : null}
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Click on the map to set exact GPS coordinates. The area name will auto-fill above.</p>
            <div className="h-64 rounded-xl overflow-hidden border border-[var(--border)] relative z-0">
              <Map 
                mode="picker" 
                selectedLocation={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                onLocationSelect={handleLocationPin}
              />
            </div>
          </div>

          {/* Universal Facilities & Amenities */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
              <div>
                <label className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>🏢</span> Residential &amp; Student Facilities (Amenities)
                </label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Click preset badges to highlight essential security, power, and lifestyle amenities.
                </p>
              </div>
              {formData.amenities && (
                <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-[var(--primary)] border border-indigo-200 dark:border-indigo-800 rounded-full">
                  {formData.amenities.split(',').filter(Boolean).length} Selected
                </span>
              )}
            </div>

            {/* Category-Grouped Preset Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESET_AMENITY_CATEGORIES.map((cat, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-[var(--border)] space-y-2.5">
                  <div className="text-xs font-extrabold text-[var(--foreground)] tracking-wide uppercase">
                    {cat.category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item, itemIdx) => {
                      const selectedList = formData.amenities
                        .split(',')
                        .map(a => a.trim().toLowerCase())
                        .filter(Boolean);
                      const isSelected = selectedList.includes(item.name.toLowerCase());

                      return (
                        <button
                          key={itemIdx}
                          type="button"
                          onClick={() => {
                            const currentList = formData.amenities
                              .split(',')
                              .map(a => a.trim())
                              .filter(Boolean);
                            let updatedList: string[];
                            if (currentList.some(a => a.toLowerCase() === item.name.toLowerCase())) {
                              updatedList = currentList.filter(a => a.toLowerCase() !== item.name.toLowerCase());
                            } else {
                              updatedList = [...currentList, item.name];
                            }
                            setFormData(prev => ({ ...prev, amenities: updatedList.join(', ') }));
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm scale-102 font-bold'
                              : 'bg-white dark:bg-slate-800/80 text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/60 hover:bg-indigo-50/40 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                          {isSelected && <span className="text-[11px] font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Amenities Comma-Separated Input */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-[var(--muted-foreground)]">
                Selected Amenities / Additional Custom Amenities (Comma-separated)
              </label>
              <input 
                type="text" 
                value={formData.amenities}
                onChange={e => setFormData({...formData, amenities: e.target.value})}
                placeholder="e.g. Standby Generator, 24/7 Water, Air Conditioning, Study Desk"
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-2.5 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              />
            </div>
          </div>

          {/* 📜 House / Hostel Rules & Curfew Policies */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div>
              <label className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <span>📜</span> Property Rules &amp; Curfew Policies
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Set clear expectations regarding gate lock times, quiet hours, and visitors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gate Lock Time */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <span>🚪</span> Gate Lock / Curfew Time
                </label>
                <select 
                  value={formData.gateLockTime}
                  onChange={e => setFormData({...formData, gateLockTime: e.target.value})}
                  className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                >
                  <option value="No Curfew / 24/7 Access">🔓 No Curfew (24/7 Access)</option>
                  <option value="10:00 PM Gate Lock">🔒 10:00 PM Gate Lock</option>
                  <option value="10:30 PM Gate Lock">🔒 10:30 PM Gate Lock</option>
                  <option value="11:00 PM Gate Lock">🔒 11:00 PM Gate Lock</option>
                  <option value="12:00 AM (Midnight) Lock">🔒 12:00 AM (Midnight) Lock</option>
                </select>
              </div>

              {/* Visitor Policy */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <span>👥</span> Visitor Policy
                </label>
                <select 
                  value={formData.visitorPolicy}
                  onChange={e => setFormData({...formData, visitorPolicy: e.target.value})}
                  className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                >
                  <option value="Open / Normal Visitors Allowed">🌐 Open / Normal Visitors Allowed</option>
                  <option value="Day visitors allowed until 8 PM">🌅 Day visitors allowed until 8 PM</option>
                  <option value="Day visitors allowed until 10 PM">🌙 Day visitors allowed until 10 PM</option>
                  <option value="Strictly No Overnight Opposite-Gender Guests">🚫 No Overnight Opposite-Gender Guests</option>
                  <option value="Strictly No External Visitors">🔒 Strictly No External Visitors</option>
                </select>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <span>🤫</span> Quiet Hours
                </label>
                <select 
                  value={formData.quietHours}
                  onChange={e => setFormData({...formData, quietHours: e.target.value})}
                  className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                >
                  <option value="From 10:00 PM">📚 From 10:00 PM (Quiet Study Hours)</option>
                  <option value="From 9:00 PM">🌙 From 9:00 PM (Early Quiet)</option>
                  <option value="From 11:00 PM">🌃 From 11:00 PM</option>
                  <option value="None / Standard Residential">🏡 Standard Residential Quietness</option>
                </select>
              </div>
            </div>
          </div>

          {/* 💳 Payment Structure & Refundable Deposits */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div>
              <label className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <span>💳</span> Payment Structure, Deposits &amp; Included Utilities
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Clarify accepted payment terms, refundable caution deposits, and included utility bills.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Accepted Payment Schedule */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <span>📅</span> Accepted Payment Schedule
                </label>
                <select 
                  value={formData.paymentSchedule}
                  onChange={e => setFormData({...formData, paymentSchedule: e.target.value})}
                  className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                >
                  <option value="Full Academic Year">🎓 Full Academic Year (Upfront)</option>
                  <option value="2 Installments (Per Semester)">🗓️ 2 Installments (Per Semester)</option>
                  <option value="Monthly in Advance">🏡 Monthly in Advance</option>
                  <option value="Annual Lease Upfront">📜 Annual Lease Upfront</option>
                  <option value="Flexible / Negotiable">🤝 Flexible / Negotiable with Landlord</option>
                </select>
              </div>

              {/* Caution Deposit (GHS) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)] flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span>🛡️</span> Refundable Caution Deposit (GHS)</span>
                  <span className="text-xs text-[var(--muted-foreground)] font-normal">Optional</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={formData.cautionDeposit}
                    onChange={e => setFormData({...formData, cautionDeposit: e.target.value})}
                    placeholder="e.g. 200 (Refundable upon move-out)"
                    className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Included Utilities Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[var(--foreground)] block">
                Included in Rental Price (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { label: '💧 Water Bill Included', val: 'Water Bill Included' },
                  { label: '🗑️ Garbage / Trash Fee Included', val: 'Garbage/Trash Service Included' },
                  { label: '🔌 Prepaid Electricity Metered per Room', val: 'Prepaid Electricity Metered per Room' },
                  { label: '🧹 Common Area Cleaning Included', val: 'Common Area Cleaning Included' },
                  { label: '🛡️ Compound Security Fee Included', val: 'Compound Security Fee Included' },
                  { label: '📶 Internet / WiFi Included', val: 'WiFi Internet Included' }
                ].map((util, uIdx) => {
                  const isChecked = formData.includedUtilities.includes(util.val);
                  return (
                    <label 
                      key={uIdx}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-bold' 
                          : 'bg-white dark:bg-slate-800/60 border-[var(--border)] text-[var(--foreground)] hover:border-slate-400'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked 
                            ? formData.includedUtilities.filter(u => u !== util.val)
                            : [...formData.includedUtilities, util.val];
                          setFormData({...formData, includedUtilities: updated});
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <span>{util.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between items-center">
              <span>Description *</span>
              {fieldErrors.description && <span className="text-xs font-bold text-red-500">⚠ Description is required</span>}
            </label>
            <textarea 
              value={formData.description}
              onChange={e => {
                setFormData({...formData, description: e.target.value});
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: false }));
              }}
              placeholder="Describe the property, rules, and nearby facilities..."
              rows={4}
              className={`w-full bg-transparent border rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 transition-all resize-none ${
                fieldErrors.description 
                  ? 'border-red-500 focus:ring-red-500/30 bg-red-50/20' 
                  : 'border-[var(--input)] focus:ring-[var(--ring)]'
              }`}
            />
          </div>

          {/* Image Gallery Upload Field */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between">
              <span>Property Gallery (Max 5 Images)</span>
              {formData.images.length > 0 && <span className="text-[var(--primary)] font-medium text-xs">{formData.images.length}/5 Uploaded</span>}
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Upload up to 5 high-quality images of the property.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.images.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] group">
                  <img src={getImageUrl(url)} alt="Property" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(p => ({...p, images: p.images.filter((_, i) => i !== idx)}))}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {formData.images.length < 5 && (
                <div className="aspect-video border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative cursor-pointer">
                  {imagesUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">Add Photos</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={imagesUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Video Upload Field */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between">
              <span>Video Walkthrough (Optional)</span>
              {formData.videoUrl && <span className="text-emerald-500 font-medium text-xs">Video Uploaded</span>}
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Build trust by uploading a short video tour (Max 50MB, MP4/WebM).</p>
            
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative">
              {videoUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">Uploading video...</span>
                </div>
              ) : formData.videoUrl ? (
                <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <Video className="w-8 h-8" />
                  <span className="text-sm font-bold">Video Ready</span>
                  <button 
                    type="button" 
                    onClick={() => { setFormData(p => ({...p, videoUrl: ''})); setVideoFile(null); }}
                    className="text-xs underline mt-1"
                  >
                    Remove Video
                  </button>
                </div>
              ) : (
                <>
                  <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <span className="text-sm font-bold text-[var(--foreground)] mb-1">Click to upload video</span>
                  <span className="text-xs text-[var(--muted-foreground)]">MP4 or WebM (Max 50MB)</span>
                  <input 
                    type="file" 
                    accept="video/mp4, video/webm"
                    onChange={handleVideoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              {createMutation.isPending ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
