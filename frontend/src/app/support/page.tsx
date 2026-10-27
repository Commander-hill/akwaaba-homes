'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  Search,
  ChevronDown,
  Send,
  CheckCircle2,
  Loader2,
  Wrench,
  HelpCircle,
  Clock,
  Building2,
} from 'lucide-react';
import TenantShell from '@/components/tenant-ui/TenantShell';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import { StatusBadge, EmptyState } from '@/components/tenant-ui/primitives';

interface FaqItem {
  id: string;
  category: 'BOOKING' | 'PAYMENTS' | 'PROPERTY_ISSUES' | 'ACCOUNT_SECURITY';
  categoryLabel: string;
  question: string;
  answer: string;
}

const FAQ_CATEGORIES = [
  { id: 'ALL', label: 'All Topics' },
  { id: 'BOOKING', label: 'Booking & Stays' },
  { id: 'PAYMENTS', label: 'Rent & Payments' },
  { id: 'PROPERTY_ISSUES', label: 'Property & Maintenance' },
  { id: 'ACCOUNT_SECURITY', label: 'Account & Security' },
] as const;

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'rent-payment-how',
    category: 'PAYMENTS',
    categoryLabel: 'Rent & Payments',
    question: 'How do rent payments work on Akwaaba Homes?',
    answer:
      'When you book a hostel room or residential apartment, your rent payment is processed securely via Paystack (Mobile Money or bank card) after both parties sign the digital tenancy agreement.',
  },
  {
    id: 'viewing-fees',
    category: 'BOOKING',
    categoryLabel: 'Booking & Stays',
    question: 'Are there any viewing or agent fees on Akwaaba Homes?',
    answer:
      'No. Akwaaba Homes prohibits informal roadside viewing fees. You can browse verified photos, room availability, and pricing online and schedule property inspections directly through the platform.',
  },
  {
    id: 'gender-policy',
    category: 'BOOKING',
    categoryLabel: 'Booking & Stays',
    question: 'How does shared student hostel room allocation work?',
    answer:
      'In shared student rooms (such as 2-in-a-room or 4-in-a-room units), you select a specific room unit and bed space. Shared units enforce single-gender occupancy for resident comfort and privacy.',
  },
  {
    id: 'lease-agreement',
    category: 'BOOKING',
    categoryLabel: 'Booking & Stays',
    question: 'When do I sign the digital tenancy agreement?',
    answer:
      'Once the property host approves your reservation request, your digital tenancy agreement (compliant with the Ghana Rent Act, Act 220) becomes available in your Booking Details page for electronic signature before payment.',
  },
  {
    id: 'maintenance-ticket',
    category: 'PROPERTY_ISSUES',
    categoryLabel: 'Property & Maintenance',
    question: 'How do I report a maintenance issue at my residence?',
    answer:
      'Tenants with an active or confirmed booking can submit a maintenance request using the form on this page or via the Report Issue action on their Booking Details page. Your landlord and assigned property caretaker are notified immediately.',
  },
  {
    id: 'move-in-dispute',
    category: 'PROPERTY_ISSUES',
    categoryLabel: 'Property & Maintenance',
    question: 'What if the room does not match the listing upon arrival?',
    answer:
      'If there is a material discrepancy between the listing and the physical room at move-in, submit a support request linked to your booking reference before confirming check-in so our compliance team can review your booking.',
  },
  {
    id: 'profile-lock',
    category: 'ACCOUNT_SECURITY',
    categoryLabel: 'Account & Security',
    question: 'Why are my profile identity fields locked after saving?',
    answer:
      'To protect statutory tenancy agreements and verified student/resident records, identity fields lock after verification. You can request edit access anytime from your Profile & Settings page.',
  },
];

function SupportContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialBookingId = searchParams.get('bookingId') || '';

  const [faqCategory, setFaqCategory] = useState<string>('ALL');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    'rent-payment-how': true,
  });

  // Support / Issue Form State
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId);
  const [issueCategory, setIssueCategory] = useState('PROPERTY_MAINTENANCE');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const { data: userResponse, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const user = userResponse?.user;
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
      if (fullName) setGuestName(fullName);
      if (user.email) setGuestEmail(user.email);
    }
  }, [user]);

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/me');
      return data;
    },
    enabled: isAuthenticated,
  });

  const allBookings: any[] = bookingsData?.bookings || [];
  const eligibleBookings = allBookings.filter((b) =>
    ['APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)
  );
  const tickets: any[] = ticketsData?.tickets || [];

  useEffect(() => {
    if (initialBookingId) {
      setSelectedBookingId(initialBookingId);
    } else if (!selectedBookingId && eligibleBookings.length > 0) {
      setSelectedBookingId(eligibleBookings[0].id);
    }
  }, [initialBookingId, eligibleBookings, selectedBookingId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const targetBooking = eligibleBookings.find((b) => b.id === selectedBookingId);

      // If authenticated and linked to an eligible booking, create a trackable maintenance/support ticket
      if (isAuthenticated && targetBooking?.propertyId) {
        const compiledDescription = `[Category: ${issueCategory.replace(/_/g, ' ')}]\n[Booking Ref: #${targetBooking.id
          .slice(0, 8)
          .toUpperCase()}]\n\n${description.trim()}`;

        const res = await api.post('/tickets', {
          propertyId: targetBooking.propertyId,
          title: subject.trim(),
          description: compiledDescription,
          priority,
        });
        return { mode: 'TICKET', data: res.data };
      }

      // Otherwise dispatch a general support inquiry via POST /contact
      const mappedSubject =
        issueCategory === 'PAYMENT'
          ? 'ESCROW_ASSISTANCE'
          : issueCategory === 'DISPUTE'
          ? 'DISPUTE_REPORT'
          : issueCategory === 'BOOKING'
          ? 'TENANCY_INQUIRY'
          : 'OTHER';

      const res = await api.post('/contact', {
        name: guestName.trim() || 'Resident',
        email: guestEmail.trim(),
        subject: mappedSubject,
        message: `[${subject.trim()}]\n\n${description.trim()}`,
      });
      return { mode: 'CONTACT', data: res.data };
    },
    onSuccess: (result) => {
      if (result.mode === 'TICKET') {
        toast.success('Support & maintenance ticket submitted.');
        setSubmittedNotice(
          'Your request has been logged and routed to your property host and support desk. You can track its status below.'
        );
        queryClient.invalidateQueries({ queryKey: ['tickets', 'tenant'] });
      } else {
        const refId = result.data?.referenceId || 'Logged';
        toast.success(`Support inquiry (${refId}) submitted.`);
        setSubmittedNotice(
          `Your support inquiry (${refId}) has been received. Updates will be sent to ${guestEmail}.`
        );
      }
      setSubject('');
      setDescription('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Unable to submit request. Please try again.');
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || subject.trim().length < 4) {
      toast.error('Please enter a brief subject for your request.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please provide at least 10 characters describing the issue.');
      return;
    }
    if (!isAuthenticated && (!guestName.trim() || !guestEmail.trim().includes('@'))) {
      toast.error('Please provide your name and email address.');
      return;
    }
    submitMutation.mutate();
  };

  const filteredFaqs = FAQ_ITEMS.filter((faq) => {
    const matchesCategory = faqCategory === 'ALL' || faq.category === faqCategory;
    const matchesSearch =
      !faqSearch.trim() ||
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTicketTone = (status: string) => {
    if (status === 'RESOLVED') return 'success' as const;
    if (status === 'IN_PROGRESS' || status === 'SCHEDULED') return 'info' as const;
    if (status === 'ESCALATED' || status === 'REJECTED') return 'danger' as const;
    return 'warning' as const;
  };

  const pageBody = (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Help &amp; Assistance
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            Support &amp; Issue Reporting
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Search common questions, report a property or booking issue, and track your submitted requests.
          </p>
        </div>

        {isAuthenticated && eligibleBookings.length > 0 && (
          <Link
            href="/dashboard/tenant/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs sm:text-sm font-medium text-[#242925] dark:text-white transition-colors self-start sm:self-auto"
          >
            <Wrench className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
            <span>Detailed Maintenance Wizard</span>
          </Link>
        )}
      </div>

      {/* Main Two-Column Layout: Left = Issue Form & Submitted Requests, Right = Searchable FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Submit Issue & Track Requests */}
        <div className="lg:col-span-7 space-y-8">
          {/* Issue / Support Request Form */}
          <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-7 shadow-2xs space-y-5">
            <div>
              <h2 className="font-editorial text-xl text-[#242925] dark:text-white">
                Submit a Support or Maintenance Request
              </h2>
              <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
                {eligibleBookings.length > 0
                  ? 'Select your booking to dispatch a property ticket directly to your host, or submit a general platform inquiry.'
                  : 'Complete the form below to submit an inquiry to the Akwaaba Homes support desk.'}
              </p>
            </div>

            {submittedNotice && (
              <div className="p-4 rounded-[12px] bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#065F46] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1F7A4C] dark:text-[#6EE7B7] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-[#242925] dark:text-white leading-relaxed">
                  {submittedNotice}
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {!isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Ama Mensah"
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
                    />
                  </div>
                </div>
              )}

              {isAuthenticated && eligibleBookings.length > 0 && (
                <div>
                  <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                    Related Booking / Property
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32] cursor-pointer"
                  >
                    {eligibleBookings.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.property?.title || 'Accommodation'} (Ref #{b.id.slice(0, 8).toUpperCase()})
                      </option>
                    ))}
                    <option value="">General Platform Inquiry (Not linked to a property)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                    Issue Category *
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32] cursor-pointer"
                  >
                    <option value="PROPERTY_MAINTENANCE">Property Repair &amp; Maintenance</option>
                    <option value="BOOKING">Booking &amp; Reservation Assistance</option>
                    <option value="PAYMENT">Rent Payment &amp; Billing</option>
                    <option value="DISPUTE">Move-In or Tenancy Dispute</option>
                    <option value="ACCOUNT_SECURITY">Account &amp; Verification</option>
                    <option value="OTHER">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                    Urgency Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32] cursor-pointer"
                  >
                    <option value="LOW">Low (Routine)</option>
                    <option value="MEDIUM">Medium (Standard)</option>
                    <option value="HIGH">High (Urgent)</option>
                    <option value="URGENT">Critical (Immediate Attention)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue or question"
                  className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue clearly so our team or your property host can assist you promptly..."
                  className="w-full p-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="h-11 px-6 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Submit Request</span>
              </button>
            </form>
          </section>

          {/* Previously Submitted Support / Maintenance Requests */}
          {isAuthenticated && (
            <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-7 shadow-2xs space-y-4">
              <div>
                <h2 className="font-editorial text-xl text-[#242925] dark:text-white">
                  Submitted Requests ({tickets.length})
                </h2>
                <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                  Track the status of your property maintenance and support tickets.
                </p>
              </div>

              {ticketsLoading ? (
                <div className="h-28 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] animate-pulse" />
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={<HelpCircle className="w-6 h-6" />}
                  title="No submitted tickets yet"
                  description="When you report a property or maintenance issue for a confirmed stay, its live status will appear here."
                />
              ) : (
                <div className="divide-y divide-[#E7E7DF] dark:divide-[#262E29]">
                  {tickets.map((t: any) => (
                    <div key={t.id} className="py-4 first:pt-1 last:pb-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#242925] dark:text-white">
                            {t.title}
                          </h3>
                          <StatusBadge tone={getTicketTone(t.status)}>
                            {t.status}
                          </StatusBadge>
                        </div>
                        <span className="text-xs text-[#6F756F] dark:text-[#A0A8A2] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(t.createdAt).toLocaleDateString('en-GH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {t.property?.title && (
                        <p className="text-xs font-medium text-[#557A67] dark:text-[#86B59C] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>
                            {t.property.title} ({t.property.location})
                          </span>
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] whitespace-pre-line leading-relaxed">
                        {t.description}
                      </p>

                      {t.resolutionNotes && (
                        <div className="p-3 rounded-[10px] bg-[#ECFDF3]/60 dark:bg-[#064E3B]/25 border border-[#A7F3D0] dark:border-[#065F46] text-xs text-[#242925] dark:text-white">
                          <strong className="block text-[#1F7A4C] dark:text-[#6EE7B7] mb-0.5">
                            Host / Caretaker Resolution Note:
                          </strong>
                          {t.resolutionNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column (5 cols): Searchable FAQ / Knowledge Base */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 shadow-2xs space-y-5">
            <div>
              <h2 className="font-editorial text-xl text-[#242925] dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                Quick answers about bookings, rent payments, and tenancy agreements.
              </p>
            </div>

            {/* Search FAQ */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#6F756F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search help topics..."
                aria-label="Search frequently asked questions"
                className="w-full h-10 pl-10 pr-3.5 bg-[#F8F7F2] dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-xs sm:text-sm text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:border-[#173D32] outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {FAQ_CATEGORIES.map((cat) => {
                const isActive = faqCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFaqCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'bg-[#F8F7F2] dark:bg-[#111513] text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#242925] dark:hover:text-white border border-[#E7E7DF] dark:border-[#262E29]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Accordion */}
            <div className="divide-y divide-[#E7E7DF] dark:divide-[#262E29]">
              {filteredFaqs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5E645E] space-y-2">
                  <p>No help topics matched &ldquo;{faqSearch}&rdquo;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFaqSearch('');
                      setFaqCategory('ALL');
                    }}
                    className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-semibold underline cursor-pointer"
                  >
                    Reset search
                  </button>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = Boolean(openFaqIds[faq.id]);
                  return (
                    <div key={faq.id} className="py-3.5 first:pt-1 last:pb-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqIds((prev) => ({ ...prev, [faq.id]: !prev[faq.id] }))
                        }
                        aria-expanded={isOpen}
                        className="w-full text-left flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#557A67] dark:text-[#86B59C] block">
                            {faq.categoryLabel}
                          </span>
                          <span className="text-sm font-semibold text-[#242925] dark:text-white leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-[#6F756F] shrink-0 mt-1 transition-transform ${
                            isOpen ? 'rotate-180 text-[#173D32] dark:text-[#86B59C]' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="pt-2 text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F2] dark:bg-[#111513]">
        <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
      </div>
    );
  }

  if (isAuthenticated && user?.role === 'TENANT') {
    return <TenantShell>{pageBody}</TenantShell>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#111513]">
      <div className="container-akwaaba py-8 sm:py-12 flex-1">{pageBody}</div>
      <PublicFooter />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F2] dark:bg-[#111513]">
          <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
        </div>
      }
    >
      <SupportContent />
    </Suspense>
  );
}
