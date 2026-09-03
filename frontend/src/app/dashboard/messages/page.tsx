'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, User, MessageSquare, Search, ShieldCheck, CheckCheck, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

interface Conversation {
  id: string;
  tenantId: string;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  partner: Partner;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setCurrentUserId(res.data.user.id);
    });
  }, []);

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
  });

  const { data: activeMessages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data } = await api.get(`/chat/${activeConversationId}/messages`);
      return data;
    },
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        queryClient.setQueryData(['messages', activeConversationId], (oldData: Message[] | undefined) => {
          if (!oldData) return [message];
          if (oldData.find(m => m.id === message.id)) return oldData;
          return [...oldData, message];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, currentUserId, activeConversationId, queryClient]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !socket || !currentUserId) return;

    const activeConv = conversations?.find(c => c.id === activeConversationId);
    if (!activeConv) return;

    const messagePayload = {
      conversationId: activeConversationId,
      receiverId: activeConv.partner.id,
      content: newMessage.trim(),
    };

    socket.emit('send_message', messagePayload);
    setNewMessage('');
  };

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  const filteredConversations = conversations?.filter(c => {
    const fullName = `${c.partner.firstName} ${c.partner.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[580px] max-h-[820px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] shadow-xs">
      
      {/* ── LEFT SIDEBAR: CONVERSATIONS LIST ── */}
      <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 min-w-[280px]">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-[#12151D]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-zinc-950 dark:text-white tracking-tight">Resident &amp; Host Inbox</h2>
            
            {/* Live Socket Status Dot */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
              <span className={clsx("w-1.5 h-1.5 rounded-full", isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400')}></span>
              <span className={isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}>
                {isConnected ? 'Real-Time' : 'Syncing'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all"
            />
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {isLoadingConversations ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#0F5132]" />
            </div>
          ) : !filteredConversations || filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const lastMessage = c.messages?.[0];

              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={clsx(
                    "w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer",
                    isActive 
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-2 border-[#0F5132]" 
                      : "hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 overflow-hidden">
                      {c.partner.avatarUrl ? (
                        <img src={c.partner.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${c.partner.firstName[0]}${c.partner.lastName[0]}`
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                        {c.partner.firstName} {c.partner.lastName}
                      </h4>
                      {lastMessage && (
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
                        {c.partner.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {lastMessage ? lastMessage.content : 'Started a new conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: ACTIVE CHAT OR ARCHITECTURAL EMPTY STATE ── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#12151D]">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#12151D]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 overflow-hidden">
                  {activeConversation.partner.avatarUrl ? (
                    <img src={activeConversation.partner.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${activeConversation.partner.firstName[0]}${activeConversation.partner.lastName[0]}`
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 dark:text-white">
                    {activeConversation.partner.firstName} {activeConversation.partner.lastName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    <span className="uppercase font-bold text-[#0F5132] dark:text-emerald-400">{activeConversation.partner.role}</span>
                    <span>•</span>
                    <span>Direct Tenancy Channel</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>Encrypted</span>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoadingMessages ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0F5132]" />
                </div>
              ) : activeMessages?.map((msg) => {
                const isMine = msg.senderId === currentUserId;

                return (
                  <div
                    key={msg.id}
                    className={clsx("flex flex-col max-w-[70%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}
                  >
                    <div className={clsx(
                      "px-4 py-2.5 rounded-2xl text-xs leading-relaxed",
                      isMine 
                        ? "bg-[#0F5132] text-white font-medium rounded-tr-xs shadow-xs" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-xs border border-zinc-200 dark:border-zinc-700"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 px-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800/60 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-[#0F5132] transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold transition-colors disabled:opacity-40 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Bespoke Architectural Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950 dark:text-white">Resident &amp; Host Communications</h3>
              <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Select a conversation from the left to coordinate lease terms, room viewings, maintenance queries, or move-in logistics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
