'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Wrench, Search, CheckCircle, AlertCircle, Clock, ShieldAlert, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import clsx from 'clsx';

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('ALL');
  
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const res = await api.get('/admin/tickets');
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.put(`/admin/tickets/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Ticket escalated/updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setSelectedTicket(null);
    },
    onError: () => {
      toast.error('Failed to update ticket');
    }
  });

  // Filter logic
  const filteredTickets = (tickets || []).filter((ticket: any) => {
    const tenantName = `${ticket.tenant?.firstName || ''} ${ticket.tenant?.lastName || ''}`.toLowerCase();
    const landlordName = `${ticket.property?.landlord?.firstName || ''} ${ticket.property?.landlord?.lastName || ''}`.toLowerCase();
    const title = (ticket.title || '').toLowerCase();
    const propertyTitle = (ticket.property?.title || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = tenantName.includes(search) || landlordName.includes(search) || title.includes(search) || propertyTitle.includes(search);
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;

    return true;
  });

  const pendingCount = tickets?.filter((t: any) => t.status === 'PENDING').length || 0;
  const inProgressCount = tickets?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0;
  const resolvedCount = tickets?.filter((t: any) => t.status === 'RESOLVED').length || 0;
  const urgentCount = tickets?.filter((t: any) => t.priority === 'URGENT' && t.status !== 'RESOLVED').length || 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-red-600/10 via-amber-600/5 to-emerald-600/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
            <Wrench className="w-4 h-4" /> Command Center
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Maintenance Tickets CRM
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Global oversight of tenant issues. Ensure landlords are resolving URGENT and PENDING tickets in a timely manner.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-amber-50/80 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/70 dark:text-amber-300/80">Pending</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
        </div>
        <div className="p-4 rounded-2xl border bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900/70 dark:text-blue-300/80">In Progress</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{inProgressCount}</span>
        </div>
        <div className="p-4 rounded-2xl border bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900/70 dark:text-emerald-300/80">Resolved</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
        </div>
        <div className="p-4 rounded-2xl border bg-red-50/80 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-900/70 dark:text-red-300/80">Urgent & Unresolved</span>
          <span className="text-2xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
            {urgentCount} {urgentCount > 0 && <ShieldAlert className="w-5 h-5 animate-pulse text-red-600" />}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search tickets, properties, landlords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer",
                statusFilter === status
                  ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {status.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Wrench className="w-12 h-12 text-slate-300 mb-4" />
            <h4 className="font-bold text-[var(--foreground)]">No tickets found</h4>
            <p className="text-xs text-[var(--muted-foreground)]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Issue / Property</th>
                  <th className="px-6 py-4 text-white font-extrabold">Tenant</th>
                  <th className="px-6 py-4 text-white font-extrabold">Landlord</th>
                  <th className="px-6 py-4 text-white font-extrabold">Priority</th>
                  <th className="px-6 py-4 text-white font-extrabold">Status</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Escalate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredTickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="font-bold text-[var(--foreground)] truncate" title={ticket.title}>{ticket.title}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] truncate" title={ticket.property?.title}>
                        {ticket.property?.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">{ticket.tenant?.firstName} {ticket.tenant?.lastName}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{ticket.tenant?.phoneNumber || ticket.tenant?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">{ticket.property?.landlord?.firstName} {ticket.property?.landlord?.lastName}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{ticket.property?.landlord?.phoneNumber || ticket.property?.landlord?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1",
                        ticket.priority === 'URGENT' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        ticket.priority === 'HIGH' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        ticket.priority === 'MEDIUM' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {ticket.priority === 'URGENT' && <ShieldAlert className="w-3 h-3" />}
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1",
                        ticket.status === 'RESOLVED' ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" :
                        ticket.status === 'IN_PROGRESS' ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400" :
                        ticket.status === 'REJECTED' ? "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400" :
                        "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
                      )}>
                        {ticket.status === 'RESOLVED' ? <CheckCircle className="w-3 h-3" /> :
                         ticket.status === 'IN_PROGRESS' ? <Clock className="w-3 h-3" /> :
                         ticket.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                         <AlertCircle className="w-3 h-3" />}
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[var(--foreground)] rounded text-[11px] font-bold transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Escalate / Manage Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center justify-between">
                Manage Ticket
                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </h3>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-2">
                <p><strong>Issue:</strong> {selectedTicket.title}</p>
                <p><strong>Desc:</strong> {selectedTicket.description}</p>
                <p><strong>Tenant:</strong> {selectedTicket.tenant?.firstName} {selectedTicket.tenant?.lastName} ({selectedTicket.tenant?.phoneNumber})</p>
                <p><strong>Landlord:</strong> {selectedTicket.property?.landlord?.firstName} {selectedTicket.property?.landlord?.lastName} ({selectedTicket.property?.landlord?.phoneNumber})</p>
                {selectedTicket.imageUrl && (
                  <p><a href={selectedTicket.imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View Attached Photo</a></p>
                )}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase mb-2">Override Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map(status => (
                    <button
                      key={status}
                      disabled={updateStatusMutation.isPending || selectedTicket.status === status}
                      onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status })}
                      className={clsx(
                        "py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center",
                        selectedTicket.status === status
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
