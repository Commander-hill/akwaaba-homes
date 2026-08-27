'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Users, CheckCircle, MessageSquare, Send, UserCheck, Flame, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RoommatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'matches' | 'invitations'>('matches');
  const [inviteModalUser, setInviteModalUser] = useState<any | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Hey! Let us team up and share a room at this hostel.');

  const [formData, setFormData] = useState({
    budget: 800,
    cleanliness: 'AVERAGE',
    sleepHabits: 'EARLY_BIRD',
    studyHabits: 'QUIET',
    bio: ''
  });

  // Fetch roommate profile & matches
  const { data: matchResponse, isLoading: isLoadingMatches, error: matchError } = useQuery({
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
      toast.success('Roommate lifestyle profile updated!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update roommate profile');
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
      toast.success('Split-Room invitation sent successfully!');
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // STATE A: LIFESTYLE QUIZ IF NO PROFILE CREATED
  if (!myProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 py-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">AI Roommate Compatibility Matcher</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Take the short Lifestyle Quiz to calculate your percentage match (% Match) with other students on campus.</p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-[var(--border)] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <form onSubmit={(e) => { e.preventDefault(); createProfileMutation.mutate(formData); }} className="space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Monthly Hostel Budget (GHS {formData.budget})</label>
              <input 
                type="range" 
                min="100" max="5000" step="50"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-[var(--primary)]"
              />
              <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                <span>GHS 100</span>
                <span>GHS 5,000+</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Cleanliness Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {['MESSY', 'AVERAGE', 'NEAT'].map(level => (
                  <button type="button" key={level} onClick={() => setFormData({...formData, cleanliness: level})} className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${formData.cleanliness === level ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Sleep Habits</label>
              <div className="grid grid-cols-2 gap-3">
                {['EARLY_BIRD', 'NIGHT_OWL'].map(habit => (
                  <button type="button" key={habit} onClick={() => setFormData({...formData, sleepHabits: habit})} className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${formData.sleepHabits === habit ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {habit.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Study Environment</label>
              <div className="grid grid-cols-2 gap-3">
                {['QUIET', 'SOCIAL'].map(habit => (
                  <button type="button" key={habit} onClick={() => setFormData({...formData, studyHabits: habit})} className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${formData.studyHabits === habit ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {habit.charAt(0) + habit.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Short Lifestyle Bio</label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="I study level 200 computer science, love quiet study nights and cooking..."
                className="w-full bg-white dark:bg-[#1C1A1B] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                rows={3}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={createProfileMutation.isPending}
              className="w-full bg-[var(--primary)] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2"
            >
              {createProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Save Profile & View Matches
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STATE B: MATCHES & INVITATIONS DASHBOARD
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 py-4">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            Roommate Finder & Compatibility
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Algorithmic lifestyle percentage matching to find your ideal hostel split-room partner.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'matches' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
          >
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'invitations' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
          >
            Invites
            {receivedInvites.filter((i: any) => i.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                {receivedInvites.filter((i: any) => i.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'matches' ? (
        <>
          {matches.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-[var(--border)]">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No Roommate Matches Yet</h3>
              <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
                No active student profiles match your budget and criteria yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match: any) => {
                const score = match.matchScore || 80;
                const isHighMatch = score >= 85;

                return (
                  <div key={match.profileId} className="glass-card rounded-3xl p-6 border border-[var(--border)] flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl hover:border-[var(--primary)]/40 group">
                    
                    {/* Percentage Match Badge */}
                    <div className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${isHighMatch ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'}`}>
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {score}% Match
                    </div>

                    <div>
                      {/* Avatar & User Details */}
                      <div className="flex items-center gap-4 mb-4">
                        {match.user.profilePictureUrl ? (
                          <img src={match.user.profilePictureUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[var(--primary)] shadow-md" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center border-2 border-[var(--primary)] shadow-md text-indigo-600 font-extrabold text-xl">
                            {match.user.firstName[0]}
                          </div>
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-[var(--foreground)]">{match.user.firstName} {match.user.lastName}</h3>
                          <p className="text-xs text-[var(--muted-foreground)]">{match.user.programmeOfStudy || 'Student'} • {match.user.campus || 'Main Campus'}</p>
                          <p className="text-xs font-bold text-[var(--primary)] mt-1">Budget: GHS {match.budget}/yr</p>
                        </div>
                      </div>

                      {match.bio && (
                        <p className="text-xs text-[var(--muted-foreground)] italic line-clamp-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-[var(--border)]">
                          "{match.bio}"
                        </p>
                      )}

                      {/* 3-Pillar Habit Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-center mb-6">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Clean</p>
                          <p className="text-xs font-bold text-[var(--foreground)]">{match.cleanliness}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Sleep</p>
                          <p className="text-xs font-bold text-[var(--foreground)]">{match.sleepHabits.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Study</p>
                          <p className="text-xs font-bold text-[var(--foreground)]">{match.studyHabits}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                      <button 
                        onClick={() => messageMutation.mutate(match.userId)}
                        disabled={messageMutation.isPending}
                        className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--foreground)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message
                      </button>
                      <button 
                        onClick={() => setInviteModalUser(match)}
                        className="py-2.5 px-3 bg-[var(--primary)] hover:opacity-90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Invite Split
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
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              📥 Received Split-Room Invitations ({receivedInvites.length})
            </h2>

            {receivedInvites.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] italic">No incoming split-room invitations.</p>
            ) : (
              <div className="space-y-3">
                {receivedInvites.map((invite: any) => (
                  <div key={invite.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {invite.sender.firstName} {invite.sender.lastName} ({invite.matchScore}% Match)
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{invite.message}</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                        Status: {invite.status}
                      </span>
                    </div>

                    {invite.status === 'PENDING' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => respondInviteMutation.mutate({ id: invite.id, status: 'ACCEPTED' })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => respondInviteMutation.mutate({ id: invite.id, status: 'REJECTED' })}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
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

          <div className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              📤 Sent Split-Room Invitations ({sentInvites.length})
            </h2>

            {sentInvites.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] italic">You haven't sent any roommate invitations yet.</p>
            ) : (
              <div className="space-y-3">
                {sentInvites.map((invite: any) => (
                  <div key={invite.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)] flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        Sent to: {invite.receiver.firstName} {invite.receiver.lastName} ({invite.matchScore}% Match)
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{invite.message}</p>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${invite.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500' : invite.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1A1B] text-[var(--foreground)] rounded-3xl p-6 max-w-md w-full border border-[var(--border)] shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2">Invite {inviteModalUser.user.firstName} to Split Room</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Send an invitation to team up and share a 2-in-a-room or 4-in-a-room hostel slot ({inviteModalUser.matchScore}% Match).
            </p>

            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Write a message to your potential roommate..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-4"
              rows={3}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setInviteModalUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-200 dark:bg-slate-700 hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={() => sendInviteMutation.mutate({ receiverId: inviteModalUser.userId, message: inviteMessage })}
                disabled={sendInviteMutation.isPending}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 flex items-center gap-1.5 shadow-md"
              >
                {sendInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
