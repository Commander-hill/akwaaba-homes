'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Lock, Building2, MapPin, UploadCloud, Info, Video, 
  Image as ImageIcon, X, Plus, Trash2, AlertCircle, ArrowLeft,
  ArrowRight, Check, CheckCircle2, Zap, Droplets,
  Car, Wind, Wifi, Dumbbell, Clock, KeyRound, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import AlertBanner from '@/components/AlertBanner';
import { Button } from '@/components/ui/Button';

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
    icon: Lock,
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

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;

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
    isAvailable: true
  });

  const [rooms, setRooms] = useState<RoomInput[]>([
    { id: Date.now().toString(), blockName: '', gender: 'MIXED', roomType: '1 in a room', numberOfRooms: 1, price: '' }
  ]);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const errorRef = useRef<HTMLDivElement>(null);

  const triggerError = (msg: string) => {
    setError(msg);
    toast.error(msg);
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const { data: property, isLoading: isFetching } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data.property;
    }
  });

  useEffect(() => {
    if (property) {
      let parsedUtils: string[] = [];
      try {
        parsedUtils = Array.isArray(property.includedUtilities) 
          ? property.includedUtilities 
          : property.includedUtilities ? JSON.parse(property.includedUtilities) : [];
      } catch (e) {
        parsedUtils = [];
      }

      let parsedImages: string[] = [];
      try {
        parsedImages = Array.isArray(property.images)
          ? property.images
          : property.images ? JSON.parse(property.images) : [];
      } catch (e) {
        parsedImages = [];
      }

      let initialAmenities = '';
      if (Array.isArray(property.amenities)) {
        initialAmenities = property.amenities.join(', ');
      } else if (typeof property.amenities === 'string') {
        try {
          const parsed = JSON.parse(property.amenities);
          initialAmenities = Array.isArray(parsed) ? parsed.join(', ') : property.amenities;
        } catch {
          initialAmenities = property.amenities;
        }
      }

      setFormData({
        title: property.title || '',
        type: property.type || 'Hostel',
        targetAudience: property.targetAudience || 'Open to All',
        furnishing: property.furnishing || 'Unfurnished',
        pricePeriod: property.pricePeriod || 'Academic Year',
        gateLockTime: property.gateLockTime || 'No Curfew / 24/7 Access',
        visitorPolicy: property.visitorPolicy || 'Day visitors allowed until 8 PM',
        quietHours: property.quietHours || 'From 10:00 PM',
        paymentSchedule: property.paymentSchedule || 'Full Academic Year',
        cautionDeposit: property.cautionDeposit !== undefined && property.cautionDeposit !== null ? property.cautionDeposit.toString() : '',
        includedUtilities: parsedUtils,
        description: property.description || '',
        location: property.location || '',
        amenities: initialAmenities,
        latitude: property.latitude || null,
        longitude: property.longitude || null,
        videoUrl: property.videoUrl || '',
        images: parsedImages,
        isAvailable: property.isAvailable !== undefined ? property.isAvailable : true
      });

      if (property.rooms && property.rooms.length > 0) {
        setRooms(property.rooms.map((r: any) => ({
          id: r.id || `${Date.now()}-${Math.random()}`,
          blockName: r.blockName || '',
          gender: r.gender || 'MIXED',
          roomType: r.roomType || '1 in a room',
          numberOfRooms: r.numberOfRooms || 1,
          price: r.price !== undefined && r.price !== null ? r.price.toString() : ''
        })));
      } else if (property.price) {
        setRooms([{
          id: Date.now().toString(),
          blockName: '',
          gender: 'MIXED',
          roomType: '1 in a room',
          numberOfRooms: 1,
          price: property.price.toString()
        }]);
      }
    }
  }, [property]);

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
    const exists = list.some(item => item.toLowerCase() === name.toLowerCase());
    const updated = exists 
      ? list.filter(item => item.toLowerCase() !== name.toLowerCase()) 
      : [...list, name];
    setFormData(prev => ({ ...prev, amenities: updated.join(', ') }));
  };

  const isAmenitySelected = (name: string) => {
    const list = formData.amenities.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return list.includes(name.toLowerCase());
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
      triggerError('You can upload a maximum of 5 images.');
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
      triggerError(err.response?.data?.error || 'Failed to upload images');
    } finally {
      setImagesUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (formData.images.length >= 5) {
      triggerError('You can upload a maximum of 5 images.');
      return;
    }
    setFormData(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }));
    setNewImageUrl('');
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
      triggerError('Video exceeds 50MB limit.');
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
      triggerError(err.response?.data?.error || 'Failed to upload video');
      setVideoFile(null);
    } finally {
      setVideoUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const parsedAmenities = data.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
      const minPrice = rooms.length > 0 
        ? Math.min(...rooms.map(r => parseFloat(r.price) || 0))
        : 0;

      const formattedData = {
        ...data,
        price: minPrice,
        rooms: rooms.map(r => ({
          id: r.id && !r.id.includes('-') && r.id.length > 10 ? r.id : undefined,
          blockName: r.blockName || null,
          gender: r.gender,
          roomType: r.roomType,
          numberOfRooms: Number(r.numberOfRooms),
          price: r.price
        })),
        amenities: parsedAmenities,
        images: data.images.length > 0 ? data.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop']
      };
      const response = await api.put(`/properties/${propertyId}`, formattedData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Property updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['landlord', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.push('/dashboard/landlord/properties');
    },
    onError: (err: any) => {
      triggerError(err.response?.data?.message || 'Failed to update property');
    }
  });

  const validateStep = (step: number) => {
    setError('');
    if (step === 1) {
      if (!formData.title.trim()) {
        triggerError('Please provide a property title.');
        return false;
      }
      if (!formData.location.trim()) {
        triggerError('Please enter or pin the property location.');
        return false;
      }
    } else if (step === 2) {
      if (rooms.length === 0) {
        triggerError('Add at least one unit configuration.');
        return false;
      }
      for (const r of rooms) {
        if (!r.numberOfRooms || Number(r.numberOfRooms) <= 0) {
          triggerError('Please provide a valid room count for each unit.');
          return false;
        }
        if (!r.price || Number(r.price) <= 0) {
          triggerError('Please enter the rate in GH₵ for all units.');
          return false;
        }
      }
    } else if (step === 4) {
      if (!formData.description.trim()) {
        triggerError('Please write an overview description of your property.');
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
    if (videoUploading) {
      triggerError('Please wait for video to finish uploading');
      return;
    }
    if (imagesUploading) {
      triggerError('Please wait for images to finish uploading');
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#16A34A]" />
        <span className="text-xs font-bold text-zinc-500">Loading property details...</span>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Property Not Found</h2>
        <p className="text-xs text-zinc-500">The property you are trying to edit does not exist or has been removed.</p>
        <Link href="/dashboard/landlord/properties">
          <Button variant="secondary" size="sm">Back to Properties</Button>
        </Link>
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
              Edit Accommodation Listing
            </h1>
          </div>

          {/* Quick Status Badge */}
          <div className="flex items-center gap-2">
            <span className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold border",
              formData.isAvailable 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] border-emerald-300 dark:border-emerald-800" 
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
            )}>
              {formData.isAvailable ? '● Published & Active' : '○ Hidden from Marketplace'}
            </span>
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
                  ? "bg-[#16A34A] text-white shadow-xs" 
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
        <AlertBanner
          ref={errorRef}
          type="error"
          message={error}
        />
      )}

      {/* ── STEP 1: IDENTITY & LOCATION ── */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 1: Property Identity &amp; Location</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Define your property name, resident targeting, and map coordinates.</p>
            </div>
            
            {/* Availability Switch */}
            <div className="flex items-center gap-3 p-2 px-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Listing Live:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.isAvailable} 
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} 
                />
                <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-[#16A34A]"></div>
              </label>
            </div>
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
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Property Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
                >
                  <option value="Hostel">Student Hostel</option>
                  <option value="Apartment">Self-Contain Apartment</option>
                  <option value="Homestay">Residential Homestay</option>
                  <option value="Studio">Executive Studio</option>
                  <option value="Residential House">Residential House</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Guest House">Guest House / Villa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Target Resident</label>
                <select
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
                >
                  <option value="Open to All">Open to All</option>
                  <option value="Students Only">Students Only</option>
                  <option value="Working Professionals">Working Professionals</option>
                  <option value="Postgraduate Only">Postgraduate Only</option>
                  <option value="Families">Families</option>
                  <option value="Short-Term Vacationers">Short-Term Vacationers</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Furnishing</label>
                <select
                  value={formData.furnishing}
                  onChange={e => setFormData({ ...formData, furnishing: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
                >
                  <option value="Academic Year">Academic Year (2 Sems)</option>
                  <option value="Semester">Per Semester</option>
                  <option value="Monthly">Monthly Rent</option>
                  <option value="Annual">1 Calendar Year</option>
                  <option value="Nightly">Nightly (Short-stay)</option>
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                />
              </div>
            </div>

            {/* Interactive Map */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Pinpoint GPS Location on Map</span>
                {isGeocoding ? (
                  <span className="text-[#16A34A] font-semibold text-xs flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Resolving neighborhood...
                  </span>
                ) : formData.latitude && formData.longitude ? (
                  <span className="text-[#16A34A] font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> GPS Coordinates Set ({formData.location || `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}`})
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
            <Button
              type="button"
              variant="emerald"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Next: Units &amp; Pricing
            </Button>
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
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold text-[#16A34A] dark:text-emerald-400">
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
                      className="text-zinc-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
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
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Gender Wing</label>
                    <select
                      value={room.gender}
                      onChange={e => handleRoomChange(room.id, 'gender', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
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
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
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
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Rate (GH₵) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">GH₵</span>
                      <input
                        type="number"
                        placeholder="e.g. 8500"
                        value={room.price}
                        onChange={e => handleRoomChange(room.id, 'price', e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#16A34A] text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Room Type / Wing</span>
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="emerald"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Next: Utilities &amp; Rules
            </Button>
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
                      <IconComponent className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
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
                                ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs font-bold"
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

            {/* Custom Amenities Comma-Separated Input */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Selected Amenities / Additional Custom Amenities (Comma-separated)
              </label>
              <input 
                type="text" 
                value={formData.amenities}
                onChange={e => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="e.g. Standby Generator, 24/7 Water, Air Conditioning, Study Desk"
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
              />
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
                  <option value="10:00 PM Gate Lock">Gate locks at 10:00 PM</option>
                  <option value="10:30 PM Gate Lock">Gate locks at 10:30 PM</option>
                  <option value="11:00 PM Gate Lock">Gate locks at 11:00 PM</option>
                  <option value="12:00 AM (Midnight) Lock">Gate locks at 12:00 Midnight</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Visitor Policy</label>
                <select
                  value={formData.visitorPolicy}
                  onChange={e => setFormData({ ...formData, visitorPolicy: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Open / Normal Visitors Allowed">Open / Normal Visitors Allowed</option>
                  <option value="Day visitors allowed until 8 PM">Day visitors until 8:00 PM</option>
                  <option value="Day visitors allowed until 10 PM">Day visitors until 10:00 PM</option>
                  <option value="Strictly No Overnight Opposite-Gender Guests">No Overnight Opposite-Gender Guests</option>
                  <option value="Strictly No External Visitors">Strictly no external visitors</option>
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
                  <option value="From 9:00 PM">Early quiet from 9:00 PM</option>
                  <option value="From 11:00 PM">Quiet hours from 11:00 PM</option>
                  <option value="24/7 Study Atmosphere">24/7 Quiet Study Atmosphere</option>
                  <option value="None / Standard Residential">Standard Residential</option>
                </select>
              </div>
            </div>
          </div>

          {/* Included Utilities, Caution Deposit & Payment Schedule */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Caution Deposit, Payment Terms &amp; Utilities</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Accepted Payment Schedule
                </label>
                <select
                  value={formData.paymentSchedule}
                  onChange={e => setFormData({ ...formData, paymentSchedule: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Full Academic Year">Full Academic Year (Upfront)</option>
                  <option value="2 Installments (Per Semester)">2 Installments (Per Semester)</option>
                  <option value="Monthly in Advance">Monthly in Advance</option>
                  <option value="Annual Lease Upfront">Annual Lease Upfront</option>
                  <option value="Flexible / Negotiable">Flexible / Negotiable with Landlord</option>
                </select>
              </div>

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
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Included in Listed Price</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Water Bill Included',
                  'Garbage/Trash Service Included',
                  'Compound Security Fee Included',
                  'WiFi Included',
                  'Prepaid ECG Metered per Room',
                  'Common Area Cleaning Included'
                ].map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => toggleUtility(u)}
                    className={clsx(
                      "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer",
                      formData.includedUtilities.includes(u)
                        ? "bg-emerald-50 text-[#16A34A] border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                    )}
                  >
                    {formData.includedUtilities.includes(u) ? '✓ ' : '+ '}{u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="emerald"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Next: Media &amp; Review
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: MEDIA, DESCRIPTION & REVIEW ── */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Step 4: Media, Overview &amp; Review</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Upload verified property photos, tour video, and review your changes before saving.</p>
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
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
              />
            </div>

            {/* Photo Gallery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Property Photos (Up to 5 Images)
                </label>
                <span className="text-xs font-bold text-zinc-500">
                  {formData.images.length} / 5 Uploaded
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 group bg-zinc-100 dark:bg-zinc-800">
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className="aspect-video rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#16A34A] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-zinc-50 dark:bg-zinc-800/30">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    {imagesUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#16A34A]" />
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-500">Upload Photo</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* URL Direct Entry Helper */}
              {formData.images.length < 5 && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Or paste direct image URL (https://...)"
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddImageUrl}
                  >
                    Add URL
                  </Button>
                </div>
              )}
            </div>

            {/* Video Tour */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Walkthrough Video (Optional, Max 50MB)
              </label>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 text-center bg-zinc-50 dark:bg-zinc-800/30">
                <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="hidden" id="video-upload" />
                {videoUploading ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#16A34A]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading walkthrough video...
                  </div>
                ) : formData.videoUrl ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-xs font-bold text-[#16A34A] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Video tour uploaded &amp; attached!
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, videoUrl: '' }))}
                      className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                    >
                      Remove Video
                    </button>
                  </div>
                ) : (
                  <label htmlFor="video-upload" className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center gap-2">
                    <Video className="w-4 h-4 text-zinc-400" />
                    <span>Upload Short Video Tour (MP4 / WebM)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Pre-Publishing / Update Audit Card */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Listing Overview Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
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
                  <span className="font-bold text-[#16A34A] dark:text-emerald-400">{totalBeds} Residents / Beds</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Unit Configs</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{rooms.length} Room Types</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Status</span>
                  <span className={clsx("font-bold", formData.isAvailable ? "text-[#16A34A]" : "text-amber-600")}>
                    {formData.isAvailable ? 'Active Marketplace' : 'Hidden Listing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="emerald"
              size="sm"
              onClick={handleSubmit}
              isLoading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              rightIcon={<Check className="w-3.5 h-3.5" />}
            >
              Update Property Listing
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
