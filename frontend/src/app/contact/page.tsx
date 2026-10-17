'use client';

import React, { useState, useEffect } from 'react';
import { 
  Phone, Mail, MapPin, 
  Send, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';

const SUBJECT_LABELS: Record<string, string> = {
  TENANCY_INQUIRY: 'Student Hostel / Accommodation Inquiry',
  LANDLORD_ONBOARDING: 'Landlord Property Registration',
  ESCROW_ASSISTANCE: 'MoMo Escrow & Payment Support',
  DISPUTE_REPORT: 'Tenancy or Booking Dispute',
  OTHER: 'General Feedback'
};

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('TENANCY_INQUIRY');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<{
    referenceId: string;
    subject: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        const u = res.data?.user || res.data;
        if (u) {
          const full = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ');
          if (full) setName((prev) => prev || full);
          if (u.email) setEmail((prev) => prev || u.email);
          if (u.phoneNumber) setPhone((prev) => prev || u.phoneNumber);
        }
      })
      .catch(() => {
        // Ignore if unauthenticated
      });
  }, []);

  const isFormValid =
    name.trim().length >= 2 &&
    email.trim().includes('@') &&
    email.trim().includes('.') &&
    message.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please fill in your full name, valid email address, and message');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/contact', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject,
        message: message.trim()
      });

      const refId = res.data?.referenceId || `INQ-${new Date().getFullYear()}-0001`;
      setSubmittedRef({
        referenceId: refId,
        subject,
        email: email.trim()
      });
      toast.success(res.data?.message || `Inquiry ${refId} received! Our support team will reply shortly.`);
      setMessage('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#090B0E] text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
            Support &amp; Inquiries
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-950 dark:text-white tracking-tight">
            Get in Touch With Us
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Have questions about student hostel bookings, statutory leases, landlord listing onboarding, or rent escrow? We are here to help.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="tel:+233536318144"
            className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-colors space-y-2 block"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
              <Phone className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Direct Hotline</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">+233 (0) 53 631 8144</div>
            <div className="text-[11px] text-zinc-400">Mon–Sat: 8:00 AM – 7:00 PM GMT</div>
          </a>

          <a
            href="mailto:support@akwaabahomes.com"
            className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-colors space-y-2 block"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <Mail className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Email Support</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">support@akwaabahomes.com</div>
            <div className="text-[11px] text-zinc-400">Response within 24 hours</div>
          </a>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Physical Hubs</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Accra (East Legon) &amp; Kumasi (Ayeduase)</div>
            <div className="text-[11px] text-zinc-400">Republic of Ghana 🇬🇭</div>
          </div>
        </div>

        {/* Submission Confirmation Banner */}
        {submittedRef && (
          <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132] text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    Inquiry Dispatched to Support Desk
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 font-mono text-[11px] font-bold text-[#0F5132] dark:text-emerald-400">
                    {submittedRef.referenceId}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Logged under <span className="font-semibold">{SUBJECT_LABELS[submittedRef.subject] || submittedRef.subject}</span>. A confirmation copy has been sent to <span className="font-mono font-semibold">{submittedRef.email}</span> and routed to our Admin Support Desk.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmittedRef(null)}
              className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline shrink-0 self-end sm:self-center cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Contact Form */}
        <div className="bg-white dark:bg-[#12151D] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kwame@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Ghana Phone / WhatsApp Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Inquiry Category</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132] [&>option]:bg-white dark:[&>option]:bg-zinc-900"
                >
                  <option value="TENANCY_INQUIRY">Student Hostel / Accommodation Inquiry</option>
                  <option value="LANDLORD_ONBOARDING">Landlord Property Registration</option>
                  <option value="ESCROW_ASSISTANCE">MoMo Escrow &amp; Payment Support</option>
                  <option value="DISPUTE_REPORT">Tenancy or Booking Dispute</option>
                  <option value="OTHER">General Feedback</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Message / Issue Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry or the accommodation you are looking for..."
                className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="px-6 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{submitting ? 'Sending Inquiry...' : 'Send Message'}</span>
              </button>
              <span className="text-[11px] text-zinc-400">
                Fields marked with <span className="text-red-500">*</span> are required
              </span>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

