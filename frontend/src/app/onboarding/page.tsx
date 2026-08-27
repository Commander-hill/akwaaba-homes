'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, ArrowRight, User, School, Calendar, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    studentId: '',
    campus: '',
    dateOfBirth: '',
    guardianName: '',
    guardianContact: ''
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // The backend route PUT /auth/profile should handle this
      const response = await api.put('/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile completed successfully!');
      // Force reload to get updated token/session data if needed, or just push
      window.location.href = '/dashboard/tenant';
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateOfBirth || !formData.guardianName || !formData.guardianContact) {
      toast.error('Please fill in Date of Birth and Emergency Contact details');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-[#0a0a0a]">
      
      {/* Decorative Background Orbs for Glassmorphism Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--primary)]/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-[var(--primary)]/10 blur-[100px]" />
      </div>

      <div className="max-w-xl w-full relative z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">Complete Your Profile</h1>
          <p className="text-[var(--muted-foreground)]">A few more details for students and resident tenants before booking.</p>
        </div>

        <div className="glass-card rounded-[24px] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Student ID */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)]">Student ID <span className="text-xs font-normal text-slate-400">(Optional for residents)</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.studentId}
                    onChange={e => setFormData({...formData, studentId: e.target.value})}
                    placeholder="e.g. 10293847 or N/A"
                    className="w-full bg-slate-50 dark:bg-[#2A2A2B]/60 border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>

              {/* Campus */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)]">Campus / City Area <span className="text-xs font-normal text-slate-400">(Optional)</span></label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.campus}
                    onChange={e => setFormData({...formData, campus: e.target.value})}
                    placeholder="e.g. UCC / East Legon"
                    className="w-full bg-slate-50 dark:bg-[#2A2A2B]/60 border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--foreground)]">Date of Birth *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="date" 
                  value={formData.dateOfBirth}
                  onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-[#2A2A2B]/60 border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-6 mt-6">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Emergency Contact</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--foreground)]">Guardian Name *</label>
                  <input 
                    type="text" 
                    value={formData.guardianName}
                    onChange={e => setFormData({...formData, guardianName: e.target.value})}
                    placeholder="Full Name"
                    className="w-full bg-slate-50 dark:bg-[#2A2A2B]/60 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--foreground)]">Guardian Contact *</label>
                  <input 
                    type="text" 
                    value={formData.guardianContact}
                    onChange={e => setFormData({...formData, guardianContact: e.target.value})}
                    placeholder="Phone Number"
                    className="w-full bg-slate-50 dark:bg-[#2A2A2B]/60 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full mt-6 bg-[var(--primary)] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
              {mutation.isPending ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
