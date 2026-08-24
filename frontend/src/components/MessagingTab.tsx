'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Send, MessageSquare, User as UserIcon, CheckCheck, RefreshCw } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface MessagingTabProps {
  initialPartnerId?: string | null;
}

export default function MessagingTab({ initialPartnerId }: MessagingTabProps) {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: conversations, isLoading: convsLoading, refetch: refetchConvs } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const res = await api.get('/chat/conversations');
      return res.data;
    },
    refetchInterval: 4000,
  });

  // If initialPartnerId was provided (e.g. clicked "Chat with Landlord"), create/find conversation
  const createConvMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const res = await api.post('/chat/conversations', { partnerId });
      return res.data;
    },
    onSuccess: (data) => {
      setActiveConvId(data.id);
      refetchConvs();
    },
  });

  useEffect(() => {
    if (initialPartnerId) {
      createConvMutation.mutate(initialPartnerId);
    }
  }, [initialPartnerId]);

  useEffect(() => {
    if (!activeConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', activeConvId],
    queryFn: async () => {
      if (!activeConvId) return [];
      const res = await api.get(`/chat/${activeConvId}/messages`);
      return res.data;
    },
    enabled: !!activeConvId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ convId, content }: { convId: string; content: string }) => {
      const res = await api.post(`/chat/${convId}/messages`, { content });
      return res.data;
    },
    onSuccess: () => {
      setNewMessageText('');
      refetchMessages();
      refetchConvs();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConvId) return;
    sendMessageMutation.mutate({ convId: activeConvId, content: newMessageText.trim() });
  };

  const activeConv = conversations?.find((c: any) => c.id === activeConvId);

  if (convsLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-[var(--border)] overflow-hidden h-[620px] flex flex-col md:flex-row shadow-lg">
      
      {/* LEFT COLUMN: Conversations List */}
      <div className="w-full md:w-80 border-r border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--primary)]" /> Messages
          </h3>
          <button 
            onClick={() => refetchConvs()} 
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh threads"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {conversations?.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
              No direct message threads yet. Start a conversation from any hostel page!
            </div>
          ) : (
            conversations?.map((conv: any) => {
              const isSelected = conv.id === activeConvId;
              const lastMsg = conv.messages?.[0];

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                    isSelected 
                      ? 'bg-indigo-500/10 border-l-4 border-[var(--primary)]' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-200 dark:border-slate-700">
                    {conv.partner?.avatarUrl ? (
                      <img src={getImageUrl(conv.partner.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-xs text-[var(--foreground)] truncate">
                        {conv.partner?.firstName} {conv.partner?.lastName}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                      {lastMsg?.content || 'Started conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Box */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#121212]">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-500/20">
                {activeConv.partner?.avatarUrl ? (
                  <img src={getImageUrl(activeConv.partner.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-[var(--primary)]" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--foreground)]">
                  {activeConv.partner?.firstName} {activeConv.partner?.lastName}
                </h4>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  Verified Contact
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messagesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-xs text-[var(--muted-foreground)] py-12">
                  Say hi to {activeConv.partner?.firstName}! Ask about room availability, amenities, or move-in dates.
                </div>
              ) : (
                messages?.map((msg: any) => {
                  const isMine = msg.senderId === session?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isMine
                            ? 'bg-gradient-to-r from-indigo-600 to-[#5B4CFF] text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-[var(--muted-foreground)] px-1">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && <CheckCheck className="w-3 h-3 text-indigo-400" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] flex gap-2 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder={`Type message to ${activeConv.partner?.firstName || 'contact'}...`}
                className="flex-1 bg-white dark:bg-slate-950 border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30 text-[var(--primary)]" />
            <p className="text-xs font-medium">Select a conversation on the left to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
