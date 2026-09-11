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
      


      <div className="max-w-xl w-full relative z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">Complete Your Profile</h1>
          <p className="text-[var(--muted-foreground)]">A few more details for student and residential tenants before booking.</p>
        </div>

        <div className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Student ID */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)]">Student ID <span className="text-xs font-normal text-slate-400">(Optional for non-students)</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.studentId}
                    onChange={e => setFormData({...formData, studentId: e.target.value})}
                    placeholder="e.g. 10293847 or N/A"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>

              {/* Campus / City Area */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--foreground)]">Campus / City Area <span className="text-xs font-normal text-slate-400">(Optional)</span></label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={formData.campus}
                    onChange={e => setFormData({...formData, campus: e.target.value})}
                    placeholder="e.g. Legon / East Legon / UCC"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
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
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-6 mt-6">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">Emergency Contact</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">Next of kin or guardian to contact in case of emergency.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--foreground)]">Contact Name *</label>
                  <input 
                    type="text" 
                    value={formData.guardianName}
                    onChange={e => setFormData({...formData, guardianName: e.target.value})}
                    placeholder="Full Name (Next of Kin / Guardian)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--foreground)]">Contact Phone *</label>
                  <input 
                    type="text" 
                    value={formData.guardianContact}
                    onChange={e => setFormData({...formData, guardianContact: e.target.value})}
                    placeholder="Phone Number (e.g. 0244123456)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full mt-6 bg-[var(--primary)] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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
