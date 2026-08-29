'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, ArrowLeft, Building, MapPin, DollarSign, Image as ImageIcon, Info, CheckCircle, Video } from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';

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

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'Hostel',
    targetAudience: 'Open to All',
    furnishing: 'Unfurnished',
    pricePeriod: 'Academic Year',
    description: '',
    price: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    amenities: '',
    imageUrl: '',
    videoUrl: '',
    isAvailable: true
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const { data: property, isLoading: isFetching } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data.property;
    }
  });

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title,
        type: property.type || 'Hostel',
        targetAudience: property.targetAudience || 'Open to All',
        furnishing: property.furnishing || 'Unfurnished',
        pricePeriod: property.pricePeriod || 'Academic Year',
        description: property.description,
        price: property.price.toString(),
        location: property.location,
        latitude: property.latitude || null,
        longitude: property.longitude || null,
        amenities: property.amenities.join(', '),
        imageUrl: property.images.length > 0 ? property.images[0] : '',
        videoUrl: property.videoUrl || '',
        isAvailable: property.isAvailable
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (videoUploading) {
      setError('Please wait for video to finish uploading');
      setIsLoading(false);
      return;
    }

    const parsedAmenities = formData.amenities.split(',').map(item => item.trim()).filter(Boolean);
    const parsedImages = formData.imageUrl ? [formData.imageUrl] : [];

    try {
      await api.put(`/properties/${propertyId}`, {
        ...formData,
        price: parseFloat(formData.price),
        amenities: parsedAmenities,
        images: parsedImages
      });
      router.push('/dashboard/landlord/properties');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update property');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  if (!property) {
    return <div className="text-center p-12 font-bold text-xl">Property not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/landlord/properties" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--foreground)]" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Edit Property</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">Update the details of your listing.</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 border border-[var(--border)]">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/50 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            
            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] rounded-xl">
              <div>
                <h3 className="font-bold text-[var(--foreground)]">Property Availability</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Turn off to temporarily hide this property from the catalog</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.isAvailable} onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Property Title</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="text" required className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Property Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
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

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Tenant</label>
                <select 
                  value={formData.targetAudience}
                  onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="Open to All">🌐 Open to All</option>
                  <option value="Students & Young Professionals">🎓 Students & Young Professionals</option>
                  <option value="Working Professionals">💼 Working Professionals</option>
                  <option value="Families">👨‍👩‍👧‍👦 Families</option>
                  <option value="Short-Term Vacationers">🏖️ Short-Term Vacationers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Pricing Period</label>
                <select 
                  value={formData.pricePeriod}
                  onChange={e => setFormData({...formData, pricePeriod: e.target.value})}
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="Academic Year">🎓 Academic Year (2 Sems)</option>
                  <option value="Monthly">🗓️ Monthly (Long-term)</option>
                  <option value="Annual">🏡 Annual (Full Year)</option>
                  <option value="Nightly">🌙 Nightly (Short-stay)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Furnishing Status</label>
                <select 
                  value={formData.furnishing}
                  onChange={e => setFormData({...formData, furnishing: e.target.value})}
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="Fully Furnished">✨ Fully Furnished</option>
                  <option value="Semi-Furnished">🛋️ Semi-Furnished</option>
                  <option value="Unfurnished">📦 Unfurnished</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Price (GHS / {formData.pricePeriod === 'Nightly' ? 'Night' : formData.pricePeriod === 'Monthly' ? 'Month' : formData.pricePeriod === 'Annual' ? 'Year' : 'Acad. Year'})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="number" required min="0" step="0.01" className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1 flex justify-between items-center">
                  <span>Location Name *</span>
                  {isGeocoding && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Auto-detecting...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                  <input type="text" required className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
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

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none"><Info className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                <textarea required rows={4} className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>

            {/* Universal Facilities & Amenities */}
            <div className="space-y-4 pt-2">
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
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl py-2.5 px-4 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Image URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" /></div>
                <input type="url" required placeholder="https://..." className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} />
              </div>
            </div>

            {/* Video Upload Field */}
            <div className="space-y-2 pt-4 border-t border-[var(--border)]">
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
                      className="text-xs underline mt-1 text-slate-500"
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

          </div>

          <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-[var(--border)] text-sm font-bold rounded-xl text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex justify-center items-center gap-2 py-3 px-6 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
