'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  DollarSign, Plus, Trash2, Download, TrendingUp, TrendingDown,
  PieChart, Calendar, Fuel, Droplet, Wrench, Shield, Sparkles, Receipt,
  Building, Loader2, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ExpenseRecord {
  id: string;
  propertyId: string;
  category: string;
  title: string;
  amount: number;
  date: string;
  receiptUrl: string | null;
  notes: string | null;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

interface AnalyticsData {
  year: number;
  summary: {
    grossRevenue: number;
    platformCommission: number;
    netRentalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  categoryBreakdown: { [key: string]: number };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
}

export default function ExpenseTrackerTab({ properties = [] }: { properties?: any[] }) {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // Fallback query to guarantee live landlord properties list
  const { data: propertiesData } = useQuery({
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

  const rawProps = (propertiesData && propertiesData.length > 0) ? propertiesData : properties;
  const propertyList = rawProps.map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || ''
  })).filter((p: any) => Boolean(p.id));

  // Form State
  const [formPropertyId, setFormPropertyId] = useState('');
  const [category, setCategory] = useState('GENERATOR_FUEL');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (!formPropertyId && propertyList.length > 0) {
      setFormPropertyId(propertyList[0].id);
    }
  }, [propertyList, formPropertyId]);

  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery<{ expenses: ExpenseRecord[]; totalExpenseAmount: number }>({
    queryKey: ['expenses', selectedPropertyId],
    queryFn: async () => {
      const url = selectedPropertyId !== 'ALL' ? `/expenses?propertyId=${selectedPropertyId}` : '/expenses';
      const res = await api.get(url);
      return res.data;
    }
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ['expensesAnalytics', selectedPropertyId],
    queryFn: async () => {
      const url = selectedPropertyId !== 'ALL' ? `/expenses/analytics/summary?propertyId=${selectedPropertyId}` : '/expenses/analytics/summary';
      const res = await api.get(url);
      return res.data;
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Operating expense logged successfully!');
      setModalOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesAnalytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log expense');
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense record deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesAnalytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  });

  const exportCSV = () => {
    if (!expensesData?.expenses || expensesData.expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = ['Date', 'Property', 'Category', 'Description', 'Amount (GHS)', 'Notes'];
    const rows = expensesData.expenses.map((e) => [
      new Date(e.date).toLocaleDateString(),
      `"${e.property?.title || 'General'}"`,
      e.category,
      `"${e.title}"`,
      e.amount.toFixed(2),
      `"${e.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Akwaaba_Expenses_PL_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('P&L Expense report downloaded!');
  };

  const summary = analytics?.summary || {
    grossRevenue: 0,
    platformCommission: 0,
    netRentalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'GENERATOR_FUEL': return { label: '⛽ Generator Fuel', color: 'bg-amber-500/10 text-amber-600' };
      case 'WATER_SUPPLY': return { label: '💧 Water Supply', color: 'bg-blue-500/10 text-blue-600' };
      case 'MAINTENANCE_REPAIR': return { label: '🔧 Repairs & Servicing', color: 'bg-red-500/10 text-red-600' };
      case 'CLEANING_WASTE': return { label: '🧹 Waste & Cleaning', color: 'bg-green-500/10 text-green-600' };
      case 'SECURITY': return { label: '🛡️ Security', color: 'bg-purple-500/10 text-purple-600' };
      case 'UTILITIES': return { label: '⚡ Utilities', color: 'bg-yellow-500/10 text-yellow-600' };
      default: return { label: '📄 Other', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Expense Tracker & Profit / Loss (P&L)</h2>
            <p className="text-xs text-slate-500">Track operating costs (fuel, water, maintenance) against rental yields</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
          >
            <option value="ALL">All Properties Portfolio</option>
            {propertyList.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.location ? `(${p.location})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:opacity-90 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      </div>

      {/* P&L Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-slate-500">Gross Rent Collected</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            GHS {summary.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Total resident payments</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-slate-500">Operating Expenses</span>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            - GHS {summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-red-500/80">Fuel, water & maintenance</span>
        </div>

        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Net Profit</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            GHS {summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600/80">After 10% platform fee & expenses</span>
        </div>

        <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Profit Margin</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {summary.profitMargin}%
          </div>
          <span className="text-[11px] text-blue-600/80">Net yield efficiency</span>
        </div>
      </div>

      {/* Monthly Trends Recharts */}
      {analytics?.monthlyTrends && analytics.monthlyTrends.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Monthly Cashflow & Net Yield Trends</h3>
              <p className="text-xs text-slate-500">Gross Rental Revenue vs. Operating Expenses vs. Net Profit</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
              {analytics.year}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(value: any) => [`GHS ${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Rental Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Operating Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net Profit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">Logged Expenses Log</h3>

        {isLoadingExpenses ? (
          <div className="p-8 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : !expensesData?.expenses || expensesData.expenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No operating expenses logged yet. Click "Log Expense" to track your property bills.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Property</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Amount (GHS)</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expensesData.expenses.map((expense) => {
                  const badge = getCategoryBadge(expense.category);
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 text-slate-500 font-medium">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {expense.property?.title}
                      </td>
                      <td className="py-3.5">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold", badge.color)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {expense.title}
                      </td>
                      <td className="py-3.5 text-right font-black text-red-600 dark:text-red-400">
                        GHS {expense.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Delete this expense record?')) {
                              deleteExpenseMutation.mutate(expense.id);
                            }
                          }}
                          disabled={deleteExpenseMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> Log Operating Expense
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Property</label>
                <select
                  value={formPropertyId}
                  onChange={(e) => setFormPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {propertyList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `(${p.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="GENERATOR_FUEL">⛽ Generator Fuel</option>
                  <option value="WATER_SUPPLY">💧 Water Tanker / Borehole Servicing</option>
                  <option value="MAINTENANCE_REPAIR">🔧 Repairs & Maintenance</option>
                  <option value="CLEANING_WASTE">🧹 Compound Cleaning & Waste Fee</option>
                  <option value="SECURITY">🛡️ Security Guard / CCTV Servicing</option>
                  <option value="UTILITIES">⚡ Compound Meter Electricity</option>
                  <option value="TAX_FEES">🏛️ Municipal Assembly Taxes & Permits</option>
                  <option value="OTHER">📄 Miscellaneous Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 50 Liters Diesel for Standby Generator"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date Incurred</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Receipt Ref (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Vendor name, receipt invoice #, etc..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetPropId = formPropertyId || propertyList[0]?.id;
                  if (!targetPropId) {
                    toast.error('Please select or add a property first');
                    return;
                  }
                  if (!title || !amount) {
                    toast.error('Title and amount are required');
                    return;
                  }
                  createExpenseMutation.mutate({
                    propertyId: targetPropId,
                    category,
                    title,
                    amount: parseFloat(amount),
                    date,
                    notes
                  });
                }}
                disabled={createExpenseMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {createExpenseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
