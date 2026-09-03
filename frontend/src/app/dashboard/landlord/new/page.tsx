'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { 
  Loader2, Lock, Building2, MapPin, UploadCloud, Info, Video, 
  Image as ImageIcon, X, Plus, Trash2, AlertCircle, ArrowLeft,
  ArrowRight, Check, CheckCircle2, ShieldCheck, Zap, Droplets,
  Shield, Car, Wind, Wifi, Dumbbell, Clock, KeyRound, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

interface RoomInput {
  id: string;
  blockName: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  roomType: string;
  numberOfRooms: number | string;
  price: string;
}

const AMENITY_SECTIONS = [
  {
    title: 'Power & Water Utilities',
    icon: Zap,
    items: [
      'Standby Generator',
      'Solar Inverter / Backup',
      '24/7 Water (Borehole / Polytank)',
      'Prepaid Electricity Meter',
      'Water Heater'
    ]
  },
  {
    title: 'Compound Security',
    icon: Shield,
    items: [
      '24/7 Security Guard',
      'CCTV Surveillance Cameras',
      'Electric Wall Fence',
      'Gated Compound',
      'Smart Keycard / Biometric Gate'
    ]
  },
  {
    title: 'Parking & Transit',
    icon: Car,
    items: [
      'Dedicated Garage Parking',
      'Underground Parking',
      'Paved Compound Parking',
      'Free Campus Shuttle Service'
    ]
  },
  {
    title: 'Climate & Comfort',
    icon: Wind,
    items: [
      'Air Conditioning (AC)',
      'Ceiling Fan',
      'Private Balcony',
      'En-Suite Bathroom'
    ]
  },
  {
    title: 'Connectivity & Study',
    icon: Wifi,
    items: [
      'High-Speed Fiber WiFi',
      'Study Desk & Chair',
      'Dedicated Study Lounge'
    ]
  },
  {
    title: 'Wellness & Facilities',
    icon: Dumbbell,
    items: [
      'Fitness Gym',
      'Swimming Pool',
      'Courtyard / Garden',
      'Fitted Kitchen / Kitchenette',
      'Laundry Service / Washing Machine'
    ]
  }
];

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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
    amenities: 'Standby Generator, 24/7 Water (Borehole / Polytank), Prepaid Electricity Meter',
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

  const handleAddRoom = () => {
    setRooms(prev => [...prev, { id: Date.now().toString(), blockName: '', gender: 'MIXED', roomType: '1 in a room', numberOfRooms: 1, price: '' }]);
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const handleRoomChange = (id: string, field: keyof RoomInput, value: any) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalBeds = rooms.reduce((acc, r) => {
    const beds = parseInt(r.roomType.split(' ')[0], 10) || 1;
    const qty = Number(r.numberOfRooms) || 0;
    return acc + (qty * beds);
  }, 0);

  const toggleAmenity = (name: string) => {
    const list = formData.amenities.split(',').map(s => s.trim()).filter(Boolean);
    const exists = list.includes(name);
    const updated = exists ? list.filter(item => item !== name) : [...list, name];
    setFormData(prev => ({ ...prev, amenities: updated.join(', ') }));
  };

  const isAmenitySelected = (name: string) => {
    const list = formData.amenities.split(',').map(s => s.trim()).filter(Boolean);
    return list.includes(name);
  };

  const toggleUtility = (name: string) => {
    setFormData(prev => ({
      ...prev,
      includedUtilities: prev.includedUtilities.includes(name)
        ? prev.includedUtilities.filter(u => u !== name)
        : [...prev.includedUtilities, name]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length + formData.images.length > 5) {
      setError('You can upload a maximum of 5 images.');
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

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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

  const validateStep = (step: number) => {
    setError('');
    if (step === 1) {
      if (!formData.title.trim()) {
        setError('Please provide a property title.');
        return false;
      }
      if (!formData.location.trim()) {
        setError('Please enter or pin the property location.');
        return false;
      }
    } else if (step === 2) {
      if (rooms.length === 0) {
        setError('Add at least one unit configuration.');
        return false;
      }
      for (const r of rooms) {
        if (!r.numberOfRooms || Number(r.numberOfRooms) <= 0) {
          setError('Please provide a valid room count for each unit.');
          return false;
        }
        if (!r.price || Number(r.price) <= 0) {
          setError('Please enter the annual rate in GH₵ for all units.');
          return false;
        }
      }
    } else if (step === 4) {
      if (!formData.description.trim()) {
        setError('Please write a brief overview description of your property.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(4)) return;
    createMutation.mutate(formData);
  };

  if (sessionLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" /></div>;
  }

  if (isListingBlocked) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-[#12151D] border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xs text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-zinc-950 dark:text-white">Listing Studio Protected</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            In compliance with Ghana Rent Act (Act 220), landlords must complete profile identification and submit Ghana Card KYC before publishing accommodations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          {isProfileIncomplete && (
            <Link href="/dashboard/profile" className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold">
              Complete Account Profile
            </Link>
          )}
          {isVerificationIncomplete && (
            <Link href="/dashboard/verification" className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold">
              Submit Ghana Card KYC
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      
      {/* ── HEADER & STEPPER ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/landlord/properties" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Properties
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Publish Accommodation Listing
            </h1>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" />
            <span>Act 220 Verified Standard</span>
          </div>
        </div>

        {/* 4-Step Segmented Bar */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Identity & GPS' },
            { step: 2, label: '2. Units & Pricing' },
            { step: 3, label: '3. Utilities & Rules' },
            { step: 4, label: '4. Media & Review' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step < currentStep || validateStep(currentStep)) {
                  setCurrentStep(s.step as any);
                }
              }}
              className={clsx(
                "py-2 text-center font-bold rounded-lg transition-all cursor-pointer truncate px-1",
                currentStep === s.step 
                  ? "bg-[#0F5132] text-white shadow-xs" 
                  : currentStep > s.step 
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: IDENTITY & LOCATION ── */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 1: Property Identity &amp; Location</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Define your property name, resident targeting, and map coordinates.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Property / Hostel Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Evandy Hostel - Executive Wing"
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Property Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="Hostel">Student Hostel</option>
                  <option value="Apartment">Self-Contain Apartment</option>
                  <option value="Homestay">Residential Homestay</option>
                  <option value="Studio">Executive Studio</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Target Resident</label>
                <select
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="Open to All">Open to All</option>
                  <option value="Students Only">Students Only</option>
                  <option value="Working Professionals">Working Professionals</option>
                  <option value="Postgraduate Only">Postgraduate Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Furnishing</label>
                <select
                  value={formData.furnishing}
                  onChange={e => setFormData({ ...formData, furnishing: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Billing Period</label>
                <select
                  value={formData.pricePeriod}
                  onChange={e => setFormData({ ...formData, pricePeriod: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="Academic Year">Academic Year (2 Sems)</option>
                  <option value="Semester">Per Semester</option>
                  <option value="Monthly">Monthly Rent</option>
                  <option value="Annual">1 Calendar Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Campus / Town Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Ayeduase Gate, KNUST / East Legon / Cape Coast"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>

            {/* Interactive Map */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Pinpoint GPS Location on Map</span>
                {isGeocoding ? (
                  <span className="text-[#0F5132] font-semibold text-xs flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Resolving neighborhood...
                  </span>
                ) : formData.latitude && formData.longitude ? (
                  <span className="text-[#0F5132] font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> GPS Coordinates Set
                  </span>
                ) : null}
              </div>
              <div className="h-64 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0">
                <Map 
                  mode="picker" 
                  selectedLocation={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                  onLocationSelect={handleLocationPin}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Units &amp; Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: UNITS & PRICING (GH₵) ── */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 2: Room Units &amp; Rates (GH₵)</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Configure unit types, bedrooms, flats, and tenancy rates in Ghana Cedis.</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0F5132] dark:text-emerald-400">
              Total Capacity: {totalBeds} Residents / Beds
            </div>
          </div>

          <div className="space-y-4">
            {rooms.map((room, idx) => (
              <div key={room.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Unit Configuration #{idx + 1}
                  </span>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(room.id)}
                      className="text-zinc-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Block / Wing</label>
                    <input
                      type="text"
                      value={room.blockName}
                      onChange={e => handleRoomChange(room.id, 'blockName', e.target.value)}
                      placeholder="e.g. Block A"
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Gender Wing</label>
                    <select
                      value={room.gender}
                      onChange={e => handleRoomChange(room.id, 'gender', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                    >
                      <option value="MIXED">Mixed / Open</option>
                      <option value="MALE">Male Wing Only</option>
                      <option value="FEMALE">Female Wing Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Room Type</label>
                    <select
                      value={room.roomType}
                      onChange={e => handleRoomChange(room.id, 'roomType', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                    >
                      <option value="1 in a room">1 in a room (Single)</option>
                      <option value="2 in a room">2 in a room (Double)</option>
                      <option value="3 in a room">3 in a room (Triple)</option>
                      <option value="4 in a room">4 in a room (Quad)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Room Count</label>
                    <input
                      type="number"
                      min="1"
                      value={room.numberOfRooms}
                      onChange={e => handleRoomChange(room.id, 'numberOfRooms', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Annual Rate (GH₵) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">GH₵</span>
                      <input
                        type="number"
                        placeholder="e.g. 8500"
                        value={room.price}
                        onChange={e => handleRoomChange(room.id, 'price', e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#0F5132] text-zinc-700 dark:text-zinc-300 hover:text-[#0F5132] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Room Type / Wing</span>
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Utilities &amp; Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: AMENITIES, UTILITIES & RULES ── */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 3: Ghanaian Amenities &amp; House Rules</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Select compound facilities, security specifications, and tenancy guidelines.</p>
          </div>

          {/* Amenities Grid */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Available Facilities</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {AMENITY_SECTIONS.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <div key={sec.title} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                      <IconComponent className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                      <span>{sec.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.items.map((item) => {
                        const sel = isAmenitySelected(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAmenity(item)}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border text-left",
                              sel
                                ? "bg-[#0F5132] text-white border-emerald-700 shadow-xs"
                                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules & Policies */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Curfew &amp; Compound Conduct</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Gate Lock / Curfew</label>
                <select
                  value={formData.gateLockTime}
                  onChange={e => setFormData({ ...formData, gateLockTime: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="No Curfew / 24/7 Access">24/7 Unrestricted Gate Access</option>
                  <option value="Gate locks at 10:00 PM">Gate locks at 10:00 PM</option>
                  <option value="Gate locks at 11:00 PM">Gate locks at 11:00 PM</option>
                  <option value="Gate locks at 12:00 Midnight">Gate locks at 12:00 Midnight</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Visitor Policy</label>
                <select
                  value={formData.visitorPolicy}
                  onChange={e => setFormData({ ...formData, visitorPolicy: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Day visitors allowed until 8 PM">Day visitors until 8:00 PM</option>
                  <option value="No visitors allowed inside rooms">Visitors allowed in lounge only</option>
                  <option value="Overnight visitors allowed with notice">Overnight permitted with notice</option>
                  <option value="Strictly no external visitors">Strictly no visitors</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Quiet Hours</label>
                <select
                  value={formData.quietHours}
                  onChange={e => setFormData({ ...formData, quietHours: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="From 10:00 PM">Quiet hours from 10:00 PM</option>
                  <option value="From 11:00 PM">Quiet hours from 11:00 PM</option>
                  <option value="24/7 Study Atmosphere">24/7 Quiet Study Atmosphere</option>
                </select>
              </div>
            </div>
          </div>

          {/* Included Utilities & Caution Deposit */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Caution Deposit &amp; Utility Coverage</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Refundable Caution Deposit (GH₵)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">GH₵</span>
                  <input
                    type="number"
                    value={formData.cautionDeposit}
                    onChange={e => setFormData({ ...formData, cautionDeposit: e.target.value })}
                    placeholder="e.g. 500 (Refundable upon move-out)"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Included in Listed Price</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Water Bill Included',
                    'Garbage/Trash Service Included',
                    'Compound Security Fee Included',
                    'WiFi Included',
                    'Prepaid ECG Metered per Room'
                  ].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => toggleUtility(u)}
                      className={clsx(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer",
                        formData.includedUtilities.includes(u)
                          ? "bg-emerald-50 text-[#0F5132] border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      {formData.includedUtilities.includes(u) ? '✓ ' : '+ '}{u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Media &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: MEDIA, DESCRIPTION & REVIEW ── */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 4: Media, Overview &amp; Review</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Upload verified property photos, tour video, and review your listing before publishing.</p>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Property Overview Description *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detail key advantages: distance to campus gate, room amenities, caretaker availability, study environment..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
            </div>

            {/* Photo Gallery */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Property Photos (Up to 5 Images)
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className="aspect-video rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#0F5132] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-zinc-50 dark:bg-zinc-800/30">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    {imagesUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#0F5132]" />
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-500">Upload Photo</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Video Tour */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Walkthrough Video (Optional, Max 50MB)
              </label>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 text-center bg-zinc-50 dark:bg-zinc-800/30">
                <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="hidden" id="video-upload" />
                {videoUploading ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#0F5132]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading walkthrough video...
                  </div>
                ) : formData.videoUrl ? (
                  <div className="text-xs font-bold text-[#0F5132] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Video tour uploaded successfully!
                  </div>
                ) : (
                  <label htmlFor="video-upload" className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center gap-2">
                    <Video className="w-4 h-4 text-zinc-400" />
                    <span>Upload Short Video Tour (MP4 / WebM)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Pre-Publishing Audit Card */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Publication Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Property</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">{formData.title || 'Untitled'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Location</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">{formData.location || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Capacity</span>
                  <span className="font-bold text-[#0F5132] dark:text-emerald-400">{totalBeds} Residents / Beds</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Unit Configs</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{rooms.length} Room Types</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Publish Listing</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
