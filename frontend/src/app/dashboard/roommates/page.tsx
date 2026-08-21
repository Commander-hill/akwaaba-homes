'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Users, CheckCircle, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoommatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    budget: 500,
    cleanliness: 'AVERAGE',
    sleepHabits: 'EARLY_BIRD',
    studyHabits: 'QUIET',
    bio: ''
  });

  // Check if profile exists
  const { data: profileResponse, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['roommateProfile'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/profile');
      return data;
    },
    retry: false, // Don't retry if 404
  });

  // Fetch matches if profile exists
  const { data: matchResponse, isLoading: isLoadingMatches, error: matchError } = useQuery({
    queryKey: ['roommateMatches'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/matches');
      return data;
    },
    enabled: !!profileResponse?.profile,
    retry: false, // Don't retry if 400
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/roommates/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roommateProfile'] });
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

  const hasProfile = !!profileResponse?.profile;

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!hasProfile) {
    // STATE A: LIFESTYLE QUIZ
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">AI Roommate Matcher</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Take the Lifestyle Quiz to find your perfect roommate match based on our smart algorithm.</p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <form onSubmit={(e) => { e.preventDefault(); createProfileMutation.mutate(formData); }} className="space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Monthly Budget (GHS {formData.budget})</label>
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
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Cleanliness</label>
              <div className="grid grid-cols-3 gap-3">
                {['MESSY', 'AVERAGE', 'NEAT'].map(level => (
                  <button type="button" key={level} onClick={() => setFormData({...formData, cleanliness: level})} className={`py-2 rounded-xl text-sm font-semibold transition-all border ${formData.cleanliness === level ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Sleep Habits</label>
              <div className="grid grid-cols-2 gap-3">
                {['EARLY_BIRD', 'NIGHT_OWL'].map(habit => (
                  <button type="button" key={habit} onClick={() => setFormData({...formData, sleepHabits: habit})} className={`py-2 rounded-xl text-sm font-semibold transition-all border ${formData.sleepHabits === habit ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {habit.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Study Habits</label>
              <div className="grid grid-cols-2 gap-3">
                {['QUIET', 'SOCIAL'].map(habit => (
                  <button type="button" key={habit} onClick={() => setFormData({...formData, studyHabits: habit})} className={`py-2 rounded-xl text-sm font-semibold transition-all border ${formData.studyHabits === habit ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-slate-400'}`}>
                    {habit.charAt(0) + habit.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Short Bio</label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="I love cooking and watch a lot of Netflix..."
                className="w-full bg-white dark:bg-[#1C1A1B] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                rows={3}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={createProfileMutation.isPending}
              className="w-full bg-[var(--primary)] text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(91,76,255,0.3)] hover:shadow-[0_0_25px_rgba(91,76,255,0.5)] transition-all flex justify-center items-center gap-2"
            >
              {createProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Find My Match
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STATE B: MATCH GRID
  const matches = matchResponse?.matches || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Your Matches</h1>
          <p className="text-[var(--muted-foreground)] mt-2">We found {matches.length} highly compatible roommates on your campus.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              budget: profileResponse.profile.budget,
              cleanliness: profileResponse.profile.cleanliness,
              sleepHabits: profileResponse.profile.sleepHabits,
              studyHabits: profileResponse.profile.studyHabits,
              bio: profileResponse.profile.bio || ''
            });
            // A bit hacky to "reset" the view, but effective for a quick edit
            queryClient.setQueryData(['roommateProfile'], null);
          }}
          className="text-sm font-bold text-[var(--primary)] hover:underline"
        >
          Edit My Quiz
        </button>
      </div>

      {isLoadingMatches ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : matchError ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30">
          <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-800 dark:text-amber-500 mb-2">Profile Incomplete</h3>
          <p className="text-amber-700/80 dark:text-amber-400/80 max-w-md mx-auto mb-6">
            {(matchError as any).response?.data?.message || 'Please update your main profile with your Gender and Campus to find matches.'}
          </p>
          <button onClick={() => router.push('/dashboard/profile')} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-md">
            Complete My Profile
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-[var(--border)]">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No matches found yet</h3>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto">We couldn't find anyone who matches your strict criteria on your campus yet. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match: any) => (
            <div key={match.id} className="glass-card rounded-3xl p-6 border border-[var(--border)] flex flex-col items-center text-center relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl hover:border-[var(--primary)]/30 group">
              
              {/* Match Percentage Ring */}
              <div className="absolute top-4 right-4 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary)]/10 border-2 border-[var(--primary)] text-[var(--primary)] font-extrabold text-xs">
                {match.matchPercentage}%
              </div>

              {match.user.avatarUrl ? (
                <img src={match.user.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white dark:border-[#1C1A1B] shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 border-4 border-white dark:border-[#1C1A1B] shadow-lg">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
              )}

              <h3 className="text-xl font-bold text-[var(--foreground)]">{match.user.firstName} {match.user.lastName}</h3>
              <p className="text-sm font-semibold text-[var(--primary)] mb-4">Budget: GHS {match.budget}</p>

              <p className="text-sm text-[var(--muted-foreground)] line-clamp-3 mb-6 italic px-2">"{match.bio}"</p>

              <div className="w-full grid grid-cols-3 gap-2 mb-6">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Clean</p>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{match.cleanliness.charAt(0) + match.cleanliness.slice(1).toLowerCase()}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Sleep</p>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{match.sleepHabits.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Study</p>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{match.studyHabits}</p>
                </div>
              </div>

              <button 
                onClick={() => messageMutation.mutate(match.user.id)}
                disabled={messageMutation.isPending}
                className="w-full bg-[#1C1A1B] dark:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all hover:bg-[var(--primary)] dark:hover:bg-[var(--primary)] flex items-center justify-center gap-2 group-hover:bg-[var(--primary)]"
              >
                {messageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
