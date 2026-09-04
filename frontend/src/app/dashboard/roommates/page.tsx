'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, CheckCircle, MessageSquare, Send, UserCheck, 
  Sparkles, XCircle, ShieldCheck, ArrowRight, UserPlus, Clock, 
  CheckCircle2, SlidersHorizontal, UserCheck2, HeartHandshake, Compass
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Human-friendly label mappers
const CLEANLINESS_MAP: Record<string, { label: string; desc: string }> = {
  MESSY: { label: 'Relaxed & Casual', desc: 'Comfort-first, casual approach to daily tidying' },
  AVERAGE: { label: 'Balanced & Standard', desc: 'Regular cleaning routine, dishes done daily' },
  NEAT: { label: 'Meticulous & Spotless', desc: 'High cleanliness standard, strictly clutter-free' },
};

const SLEEP_MAP: Record<string, { label: string; desc: string }> = {
  EARLY_BIRD: { label: 'Early Riser', desc: 'Active by 6:00 AM, lights out early' },
  NIGHT_OWL: { label: 'Night Owl', desc: 'Thrives late at night, flexible schedule' },
};

const STUDY_MAP: Record<string, { label: string; desc: string }> = {
  QUIET: { label: 'Quiet & Focused', desc: 'Low noise, respects work & study hours' },
  SOCIAL: { label: 'Social & Collaborative', desc: 'Enjoys conversation & friendly household energy' },
};

export default function RoommatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'matches' | 'invitations'>('matches');
  const [inviteModalUser, setInviteModalUser] = useState<any | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Hi! I noticed our living habits and budget align well. Would you be interested in teaming up to co-rent a residential apartment?');

  const [formData, setFormData] = useState({
    budget: 1500,
    cleanliness: 'AVERAGE',
    sleepHabits: 'EARLY_BIRD',
    studyHabits: 'QUIET',
    bio: ''
  });

  // Fetch roommate profile & matches
  const { data: matchResponse, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['roommateMatches'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/matches');
      return data;
    },
    retry: false,
  });

  // Fetch invitations
  const { data: inviteResponse, isLoading: isLoadingInvites } = useQuery({
    queryKey: ['roommateInvitations'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/invitations');
      return data;
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/roommates/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roommateMatches'] });
      toast.success('Co-living lifestyle profile saved!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  });

  const messageMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const { data } = await api.post('/chat/conversations', { partnerId });
      return data;
    },
    onSuccess: () => {
      router.push('/dashboard/messages');
    }
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ receiverId, message }: { receiverId: string; message: string }) => {
      await api.post('/roommates/invite', { receiverId, message });
    },
    onSuccess: () => {
      setInviteModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['roommateInvitations'] });
      toast.success('Co-living lease invitation sent!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    }
  });

  const respondInviteMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      await api.put(`/roommates/invitations/${id}/respond`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roommateInvitations'] });
      toast.success(`Invitation ${variables.status.toLowerCase()}!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update invitation');
    }
  });

  const myProfile = matchResponse?.myProfile;
  const matches = matchResponse?.matches || [];
  const receivedInvites = inviteResponse?.received || [];
  const sentInvites = inviteResponse?.sent || [];

  if (isLoadingMatches) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-400">Loading co-living compatibility studio...</p>
      </div>
    );
  }

  // ── STATE A: CO-LIVING ONBOARDING PROFILE SETUP ──
  if (!myProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-in">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Co-Living &amp; Flatmate Matching Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Find Your Ideal Flatmate or Roommate
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
            Set your shared monthly budget and daily lifestyle habits. Our compatibility algorithm pairs you with verified working professionals and scholars to split residential rentals.
          </p>
        </div>

        <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={(e) => { e.preventDefault(); createProfileMutation.mutate(formData); }} className="space-y-6">
            
            {/* Monthly Budget Contribution */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Target Monthly Rent Contribution
                </label>
                <span className="text-base font-black text-[#0F5132] dark:text-emerald-400">
                  GH₵ {formData.budget.toLocaleString()} / month
                </span>
              </div>
              <input 
                type="range" 
                min="200" max="8000" step="100"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#0F5132]"
              />
              <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                <span>GH₵ 200 (Economy)</span>
                <span>GH₵ 4,000 (Mid-tier)</span>
                <span>GH₵ 8,000+ (Executive)</span>
              </div>
            </div>

            {/* Cleanliness & Home Order */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Cleanliness &amp; Living Habits
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['MESSY', 'AVERAGE', 'NEAT'] as const).map((level) => {
                  const info = CLEANLINESS_MAP[level];
                  const isSelected = formData.cleanliness === level;
                  return (
                    <button 
                      type="button" 
                      key={level} 
                      onClick={() => setFormData({...formData, cleanliness: level})} 
                      className={clsx(
                        "p-3 rounded-xl text-left border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-[#0F5132]/5 dark:bg-emerald-950/30 border-[#0F5132] ring-1 ring-[#0F5132]" 
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div className="font-bold text-xs text-zinc-900 dark:text-white">{info.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{info.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sleep Habits */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Daily Schedule &amp; Sleep Routine
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['EARLY_BIRD', 'NIGHT_OWL'] as const).map((habit) => {
                  const info = SLEEP_MAP[habit];
                  const isSelected = formData.sleepHabits === habit;
                  return (
                    <button 
                      type="button" 
                      key={habit} 
                      onClick={() => setFormData({...formData, sleepHabits: habit})} 
                      className={clsx(
                        "p-3 rounded-xl text-left border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-[#0F5132]/5 dark:bg-emerald-950/30 border-[#0F5132] ring-1 ring-[#0F5132]" 
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div className="font-bold text-xs text-zinc-900 dark:text-white">{info.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{info.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Work & Living Environment */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Work &amp; Living Environment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['QUIET', 'SOCIAL'] as const).map((habit) => {
                  const info = STUDY_MAP[habit];
                  const isSelected = formData.studyHabits === habit;
                  return (
                    <button 
                      type="button" 
                      key={habit} 
                      onClick={() => setFormData({...formData, studyHabits: habit})} 
                      className={clsx(
                        "p-3 rounded-xl text-left border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-[#0F5132]/5 dark:bg-emerald-950/30 border-[#0F5132] ring-1 ring-[#0F5132]" 
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div className="font-bold text-xs text-zinc-900 dark:text-white">{info.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{info.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lifestyle & Career Bio */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Co-Living Bio &amp; Preferences
              </label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="e.g. Software engineer in Airport Residential, hybrid schedule. Clean and quiet during weekdays, enjoy cooking and exploring Accra on weekends..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-[#0F5132] rounded-xl px-4 py-3 text-xs outline-none transition-all resize-none"
                rows={3}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={createProfileMutation.isPending}
              className="w-full py-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {createProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Save Lifestyle Profile &amp; Discover Matches</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── STATE B: MATCHES & CO-LIVING LEASE INVITATIONS ──
  return (
    <div className="space-y-6 animate-in py-2 max-w-7xl mx-auto">
      
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Co-Living &amp; Flatmate Matches
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Active Profile
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Algorithmic lifestyle percentage matching to find your ideal co-tenant or flatmate across Ghana.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveTab('matches')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'matches' 
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'invitations' 
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <span>Lease Invites</span>
            {receivedInvites.filter((i: any) => i.status === 'PENDING').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {receivedInvites.filter((i: any) => i.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'matches' ? (
        <>
          {matches.length === 0 ? (
            <div className="p-12 text-center border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
              <Users className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Direct Matches Found Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No active tenant profiles match your exact budget and lifestyle habits today. As new residents register, compatible matches will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match: any) => {
                const score = match.matchScore || 80;
                const cleanInfo = CLEANLINESS_MAP[match.cleanliness] || { label: match.cleanliness, desc: '' };
                const sleepInfo = SLEEP_MAP[match.sleepHabits] || { label: match.sleepHabits, desc: '' };
                const studyInfo = STUDY_MAP[match.studyHabits] || { label: match.studyHabits, desc: '' };

                return (
                  <div 
                    key={match.profileId} 
                    className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-xs hover:border-zinc-300 transition-all space-y-4"
                  >
                    <div>
                      {/* Top Bar: Match Score & Verification */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{score}% Lifestyle Match</span>
                        </span>
                        
                        <span className="text-[10px] font-bold text-zinc-500">
                          Budget: GH₵ {Number(match.budget).toLocaleString()}/mo
                        </span>
                      </div>

                      {/* User Snapshot */}
                      <div className="flex items-center gap-3 mb-3">
                        {match.user.profilePictureUrl ? (
                          <img src={match.user.profilePictureUrl} alt="Avatar" className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                            {match.user.firstName ? match.user.firstName[0] : 'U'}
                            {match.user.lastName ? match.user.lastName[0] : 'T'}
                          </div>
                        )}
                        <div className="truncate">
                          <h3 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                            {match.user.firstName} {match.user.lastName}
                          </h3>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {match.user.programmeOfStudy || 'Working Professional'}
                          </div>
                          {match.user.ghanaCardStatus === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F5132] dark:text-emerald-400">
                              <ShieldCheck className="w-3 h-3" /> Ghana Card Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bio Quote */}
                      {match.bio && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-2 mb-3 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                          "{match.bio}"
                        </p>
                      )}

                      {/* 3 Lifestyle Metrics */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">Living Habit</span>
                          <span className="font-bold text-[11px] text-zinc-900 dark:text-white truncate block">{cleanInfo.label}</span>
                        </div>
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">Schedule</span>
                          <span className="font-bold text-[11px] text-zinc-900 dark:text-white truncate block">{sleepInfo.label}</span>
                        </div>
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">Work Style</span>
                          <span className="font-bold text-[11px] text-zinc-900 dark:text-white truncate block">{studyInfo.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Strip */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold">
                      <button 
                        onClick={() => messageMutation.mutate(match.userId)}
                        disabled={messageMutation.isPending}
                        className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#0F5132]" />
                        <span>Chat</span>
                      </button>
                      <button 
                        onClick={() => setInviteModalUser(match)}
                        className="py-2 px-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Split Lease</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* INVITATIONS TAB */
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>📥 Incoming Co-Living Lease Invites</span>
              <span className="text-xs text-zinc-400 font-normal">({receivedInvites.length})</span>
            </h2>

            {receivedInvites.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-2">No incoming co-living lease invitations.</p>
            ) : (
              <div className="space-y-2.5">
                {receivedInvites.map((invite: any) => (
                  <div key={invite.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-950 dark:text-white">
                          {invite.sender.firstName} {invite.sender.lastName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#0F5132] border border-emerald-200">
                          {invite.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1">{invite.message}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-zinc-400 uppercase">
                        Status: {invite.status}
                      </span>
                    </div>

                    {invite.status === 'PENDING' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => respondInviteMutation.mutate({ id: invite.id, status: 'ACCEPTED' })}
                          className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => respondInviteMutation.mutate({ id: invite.id, status: 'REJECTED' })}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>📤 Sent Co-Living Lease Invites</span>
              <span className="text-xs text-zinc-400 font-normal">({sentInvites.length})</span>
            </h2>

            {sentInvites.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-2">You have not dispatched any co-living lease invitations yet.</p>
            ) : (
              <div className="space-y-2.5">
                {sentInvites.map((invite: any) => (
                  <div key={invite.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-zinc-950 dark:text-white block">
                        Sent to: {invite.receiver.firstName} {invite.receiver.lastName} ({invite.matchScore}% Match)
                      </span>
                      <p className="text-zinc-500 mt-0.5">{invite.message}</p>
                    </div>
                    <span className={clsx(
                      "text-[10px] font-black px-2.5 py-1 rounded-full",
                      invite.status === 'ACCEPTED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      invite.status === 'REJECTED' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    )}>
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CO-LIVING LEASE INVITATION MODAL ── */}
      {inviteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] text-zinc-950 dark:text-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-in">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-zinc-950 dark:text-white">
                  Invite {inviteModalUser.user.firstName} to Split a Lease
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Propose teaming up to co-rent an apartment ({inviteModalUser.matchScore}% Lifestyle Match).
                </p>
              </div>
              <button onClick={() => setInviteModalUser(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Invitation Message
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Write a personalized note to your prospective flatmate..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs outline-none focus:border-[#0F5132] resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setInviteModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => sendInviteMutation.mutate({ receiverId: inviteModalUser.userId, message: inviteMessage })}
                disabled={sendInviteMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0F5132] hover:bg-[#0A3D24] text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {sendInviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Co-Living Invite</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
