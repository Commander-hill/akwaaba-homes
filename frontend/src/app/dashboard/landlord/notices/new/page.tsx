'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  ArrowLeft, 
  Building, 
  Zap, 
  Droplet, 
  Wrench, 
  ShieldAlert, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Info, 
  Clock, 
  Send, 
  BellRing,
  Smartphone,
  Sparkles,
  Users
} from 'lucide-react';

interface NoticePreset {
  title: string;
  category: string;
  priority: string;
  message: string;
}

const GHANAIAN_NOTICE_PRESETS: NoticePreset[] = [
  {
    title: '⚡ ECG Scheduled Maintenance & Standby Generator Schedule',
    category: 'UTILITY',
    priority: 'IMPORTANT',
    message: 'Notice to all residents: ECG has scheduled power maintenance for our district tomorrow between 9:00 AM and 4:00 PM. The compound standby generator will run from 10:00 AM to 1:00 PM, and from 6:00 PM onwards if grid power is not yet restored. Please unplug sensitive electronics.'
  },
  {
    title: '💧 GWCL Water Tanker Refill & Overhead Polytank Cleaning',
    category: 'UTILITY',
    priority: 'NORMAL',
    message: 'A 1,500-gallon water tanker has been delivered to replenish the compound polytanks. Water supply will be briefly isolated for 45 minutes while the caretaker flushes the distribution valve. Normal pressure will resume shortly.'
  },
  {
    title: '🛑 Compound Fumigation & Pest Control (Corridors & Yard)',
    category: 'MAINTENANCE',
    priority: 'IMPORTANT',
    message: 'General compound pest control and fumigation will take place this Saturday at 8:00 AM. Residents are advised to close all room windows and keep footwear inside during the spraying exercise. Compound gates will remain open for ventilation.'
  },
  {
    title: '🔐 Main Entrance Gate Security & Late Night Curfew Protocol',
    category: 'SECURITY',
    priority: 'IMPORTANT',
    message: 'For the safety and security of all residents, the main compound gate will be locked at 10:30 PM each night. If you expect to arrive past 10:30 PM, kindly inform the resident security guard or caretaker on WhatsApp in advance.'
  },
  {
    title: '🚨 EMERGENCY: Compound Water Main Distribution Line Leak',
    category: 'MAINTENANCE',
    priority: 'EMERGENCY',
    message: 'Urgent notice: A cracked PVC connector on the main borehole pumping line has been detected. Pumping has been paused immediately to avoid flooding. Plumber is on-site and repairs are estimated to take 2 hours.'
  },
  {
    title: '🧹 End-of-Month Compound General Cleaning & Waste Disposal',
    category: 'GENERAL',
    priority: 'NORMAL',
    message: 'Our monthly general sanitation exercise will be held this Saturday between 7:00 AM and 9:00 AM. Please ensure all personal trash bags are tied securely and placed inside the Zoomlion dumpsters.'
  }
];

export default function NewCompoundNoticePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [category, setCategory] = useState<string>('UTILITY');
  const [priority, setPriority] = useState<string>('NORMAL');
  
  // Default expiry: 7 days from now
  const defaultExpiryDate = new Date();
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 7);
  const [expiresAt, setExpiresAt] = useState<string>(defaultExpiryDate.toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string>('');

  // Fetch properties owned by landlord
  const { data: propertiesData, isLoading: isLoadingProps } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  const propertyList = (propertiesData || []).map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || 'Ghana',
    type: p.type || 'Hostel/Apartment'
  })).filter((p: any) => Boolean(p.id));

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);

  const applyPreset = (preset: NoticePreset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    setMessage(preset.message);
    toast.success('Preset notice loaded!');
  };

  const createNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/compound-notices', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Notice broadcasted to all residents!');
      queryClient.invalidateQueries({ queryKey: ['compoundNotices', 'landlord'] });
      router.push('/dashboard/landlord?tab=notices');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to post compound notice';
      setFormError(msg);
      toast.error(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a target property for this broadcast.');
      toast.error('Property selection required.');
      return;
    }

    if (!title.trim()) {
      setFormError('Notice headline / title cannot be empty.');
      toast.error('Title is required.');
      return;
    }

    if (!message.trim()) {
      setFormError('Notice message body cannot be empty.');
      toast.error('Message content is required.');
      return;
    }

    createNoticeMutation.mutate({
      propertyId: selectedPropertyId,
      title: title.trim(),
      message: message.trim(),
      category,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord?tab=notices"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Compound Notices"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/dashboard/landlord" className="hover:underline">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/landlord?tab=notices" className="hover:underline">Notices</Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Broadcast New Notice</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Broadcast Compound Notice to Residents
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Megaphone className="w-3.5 h-3.5 text-amber-600" />
              Instant Resident Bulletin
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2-Columns: Notice Details Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Error Banner */}
              {formError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="font-semibold">{formError}</div>
                </div>
              )}

              {/* 1. Target Property Selection Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        1. Target Property & Residents
                      </h2>
                      <p className="text-xs text-slate-500">
                        Select the hostel or apartment block that will receive this announcement
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {propertyList.length} properties
                  </span>
                </div>

                {isLoadingProps ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading properties...
                  </div>
                ) : propertyList.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                    No properties registered. Please create a property first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {propertyList.map((prop: any) => {
                      const isSelected = selectedPropertyId === prop.id;
                      return (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => setSelectedPropertyId(prop.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {prop.title}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            📍 {prop.location}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Notice Category & Priority */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      2. Category & Urgency Classification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Determines alert styling and notification badge color in resident apps
                    </p>
                  </div>
                </div>

                {/* Priority Levels */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                    Alert Urgency / Priority Level *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPriority('NORMAL')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                        priority === 'NORMAL'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">NORMAL</span>
                        {priority === 'NORMAL' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500">Routine notice, general updates, non-disruptive events.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority('IMPORTANT')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                        priority === 'IMPORTANT'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">IMPORTANT</span>
                        {priority === 'IMPORTANT' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500">Service downtime, gate curfew, inspection schedules.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority('EMERGENCY')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                        priority === 'EMERGENCY'
                          ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-red-600 dark:text-red-400">🚨 EMERGENCY</span>
                        {priority === 'EMERGENCY' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-[11px] text-slate-500">Immediate action needed (flood, pipe burst, security alert).</p>
                    </button>
                  </div>
                </div>

                {/* Category Options */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                    Topic Category *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'UTILITY', label: '⚡ Utility & Power / Water', icon: Zap },
                      { id: 'MAINTENANCE', label: '🛠️ Repairs & Sanitation', icon: Wrench },
                      { id: 'SECURITY', label: '🔐 Compound Security & Gate', icon: ShieldAlert },
                      { id: 'EVENT', label: '📅 Community Gathering / Event', icon: Calendar },
                      { id: 'GENERAL', label: '📢 General Housekeeping', icon: Info },
                    ].map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Presets Row */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    💡 Quick-Fill Ghanaian Notice Templates (Click to apply):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GHANAIAN_NOTICE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors line-clamp-1"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Notice Message Content & Expiry */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      3. Notice Headline & Detailed Announcement
                    </h2>
                    <p className="text-xs text-slate-500">
                      Write clear instructions for residents
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Notice Headline / Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ⚡ ECG Scheduled Power Maintenance Tomorrow (9am - 4pm)"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0F5132]"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Announcement Body *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {message.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write detailed instructions, times, affected flats/rooms, emergency contact phone number..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0F5132] leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Auto-Archive / Expiration Date (Optional)
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden max-w-xs">
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-4 py-2.5 bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    The notice will be removed from the resident active bulletin board after this date.
                  </span>
                </div>
              </div>

            </div>

            {/* Right Column: Live Push Notification Preview & Broadcast Action */}
            <div className="space-y-6">

              {/* Smartphone Push Alert Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    Resident Mobile Preview
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                    Live Push
                  </span>
                </div>

                {/* Simulated Notification Toast */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Akwaaba Homes
                    </div>
                    <span>now</span>
                  </div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      priority === 'EMERGENCY' ? 'bg-red-500 text-white' :
                      priority === 'IMPORTANT' ? 'bg-amber-500 text-white' :
                      'bg-[#0F5132] text-white'
                    }`}>
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="text-xs font-black truncate">
                        {title || 'Notice Headline...'}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {message || 'Notice content will appear here on tenant mobile screens...'}
                      </p>
                      <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                        📍 {activeProperty?.title || 'Your Residence'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span className="font-semibold">Recipients:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">All Active Tenants</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Channels:</span>
                    <span>In-App Bulletin &amp; Socket Push</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Status:</span>
                    <span className="text-emerald-600 font-bold">Published Immediately</span>
                  </div>
                </div>

                {/* Primary Broadcast Button */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={createNoticeMutation.isPending}
                    className="w-full py-3.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {createNoticeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting to Residents...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Broadcast Notice Now
                      </>
                    )}
                  </button>

                  <Link
                    href="/dashboard/landlord?tab=notices"
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center"
                  >
                    Cancel &amp; Return
                  </Link>
                </div>
              </div>

              {/* Best Practices Advisory Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Info className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">
                    Compound Broadcasting Etiquette
                  </h4>
                </div>
                <ul className="text-xs text-slate-400 space-y-2 leading-relaxed list-disc pl-4">
                  <li>Reserve <strong>EMERGENCY</strong> priority exclusively for safety hazards, immediate water isolation, or security alerts.</li>
                  <li>Give tenants at least 24 hours advance warning for scheduled generator maintenance or compound fumigation.</li>
                  <li>Notices are archived automatically when expired, preserving your resident communications audit log.</li>
                </ul>
              </div>

            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
