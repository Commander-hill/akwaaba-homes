'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, Lock, Building2, MapPin, UploadCloud, Info, Video, Image as ImageIcon, X, Plus, Trash2, DollarSign } from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';

interface RoomInput {
  id: string;
  roomType: string;
  numberOfRooms: number;
  price: string;
}

export default function NewPropertyPage() {
  const router = useRouter();
  
  // Subscription Check
  const { data: subResponse, isLoading: isLoadingSub } = useQuery({
    queryKey: ['subscriptions', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/status');
      return data;
    }
  });

  const [formData, setFormData] = useState({
    title: '',
    type: 'Hostel',
    description: '',
    location: '',
    amenities: '',
    latitude: null as number | null,
    longitude: null as number | null,
    videoUrl: '',
    images: [] as string[],
  });

  const [rooms, setRooms] = useState<RoomInput[]>([
    { id: Date.now().toString(), roomType: '1 in a room', numberOfRooms: 1, price: '' }
  ]);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        rooms: rooms.map(r => ({
          roomType: r.roomType,
          numberOfRooms: r.numberOfRooms,
          price: r.price
        })),
        amenities: data.amenities.split(',').map((a: string) => a.trim()).filter(Boolean),
        images: data.images.length > 0 ? data.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop'] // Default image for demo
      };
      const response = await api.post('/properties', formattedData);
      return response.data;
    },
    onSuccess: () => {
      router.push('/properties');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to list property');
    }
  });

  if (isLoadingSub) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  // SUBSCRIPTION WALL
  if (!subResponse?.isActive) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">Feature Locked</h1>
        <p className="text-[var(--muted-foreground)] mb-8">You need an active Premium subscription to list properties on Akwaaba Homes.</p>
        <Link href="/dashboard/landlord/subscription" className="bg-[var(--primary)] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition-opacity">
          Upgrade to Premium
        </Link>
      </div>
    );
  }

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
    setRooms(prev => [...prev, { id: Date.now().toString(), roomType: '1 in a room', numberOfRooms: 1, price: '' }]);
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const handleRoomChange = (id: string, field: keyof RoomInput, value: any) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalCapacity = rooms.reduce((acc, r) => {
    const beds = parseInt(r.roomType.split(' ')[0], 10) || 1;
    return acc + (r.numberOfRooms * beds);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.title || !formData.type || !formData.description || !formData.location) {
      setError('Please fill in all required property fields.');
      return;
    }
    if (rooms.length === 0) {
      setError('You must add at least one room configuration.');
      return;
    }
    for (const room of rooms) {
      if (!room.roomType || !room.numberOfRooms || !room.price) {
        setError('Please fill in all fields for every room configuration.');
        return;
      }
    }
    if (videoUploading || imagesUploading) {
      setError('Please wait for media to finish uploading');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">List New Property</h1>
        <p className="text-[var(--muted-foreground)]">Create a stunning listing to attract the best tenants.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)]">Property Title *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Luxury Single Room at Evandy"
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)]">Property Type *</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
              >
                <option value="Hostel">Hostel</option>
                <option value="Homestay">Homestay</option>
                <option value="Apartment">Apartment</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)]">Location Name *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Ayeduase"
                  className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                />
              </div>
            </div>
          </div>

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
              {rooms.map((room, index) => (
                <div key={room.id} className="p-5 border border-[var(--border)] rounded-xl bg-slate-50/50 dark:bg-slate-800/20 relative">
                  {rooms.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRoom(room.id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mr-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--foreground)]">Room Type</label>
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
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--foreground)]">Number of Rooms</label>
                      <input 
                        type="number" 
                        min="1"
                        value={room.numberOfRooms}
                        onChange={e => handleRoomChange(room.id, 'numberOfRooms', parseInt(e.target.value) || '')}
                        placeholder="Qty"
                        className="w-full bg-transparent border border-[var(--input)] rounded-lg py-2 px-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--foreground)]">Price/Year (GHS)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" 
                          min="1"
                          value={room.price}
                          onChange={e => handleRoomChange(room.id, 'price', e.target.value)}
                          placeholder="Amount"
                          className="w-full bg-transparent border border-[var(--input)] rounded-lg py-2 pl-8 pr-3 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-[var(--border)] rounded-xl p-4 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total Capacity</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Maximum tenants this property can accommodate</p>
                </div>
                <div className="text-2xl font-extrabold text-[var(--primary)]">{totalCapacity}</div>
              </div>
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between">
              <span>Pinpoint on Map *</span>
              {formData.latitude && formData.longitude && (
                <span className="text-emerald-500 font-medium text-xs">Location Selected</span>
              )}
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Click on the map to set the exact GPS coordinates for this property.</p>
            <div className="h-64 rounded-xl overflow-hidden border border-[var(--border)] relative z-0">
              <Map 
                mode="picker" 
                selectedLocation={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                onLocationSelect={(lat, lng) => setFormData({...formData, latitude: lat, longitude: lng})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)]">Amenities</label>
            <input 
              type="text" 
              value={formData.amenities}
              onChange={e => setFormData({...formData, amenities: e.target.value})}
              placeholder="e.g. AC, WiFi, Study Desk (Comma separated)"
              className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--foreground)] flex justify-between">
              <span>Description *</span>
            </label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the property, rules, and nearby facilities..."
              rows={4}
              className="w-full bg-transparent border border-[var(--input)] rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all resize-none"
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
                  <img src={url} alt="Property" className="w-full h-full object-cover" />
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
