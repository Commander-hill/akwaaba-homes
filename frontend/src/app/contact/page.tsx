'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Phone, Mail, MapPin, MessageSquare, 
  Send, Clock, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('TENANCY_INQUIRY');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in your name, email, and message');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Your message has been received! Our support team will reply via email/WhatsApp.');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }, 1000);
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
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
              <Phone className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Direct Hotline</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">+233 (0) 53 631 8144</div>
            <div className="text-[11px] text-zinc-400">Mon–Sat: 8:00 AM – 7:00 PM GMT</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <Mail className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Email Support</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">support@akwaabahomes.com</div>
            <div className="text-[11px] text-zinc-400">Response within 24 hours</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-zinc-950 dark:text-white">Physical Hubs</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Accra (East Legon) &amp; Kumasi (Ayeduase)</div>
            <div className="text-[11px] text-zinc-400">Republic of Ghana 🇬🇭</div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-[#12151D] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
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
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Message / Issue Details</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry or the accommodation you are looking for..."
                className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-[#0F5132] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Message</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
