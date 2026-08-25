'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, User, MessageSquare, Search, ShieldCheck, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  // Fetch current user details quickly to know our own ID
  useEffect(() => {
    api.get('/auth/me').then(res => {
      setCurrentUserId(res.data.user.id);
    });
  }, []);

  // Fetch Conversations List
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
  });

  // Fetch Messages for Active Conversation
  const { data: activeMessages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data } = await api.get(`/chat/${activeConversationId}/messages`);
      return data;
    },
    enabled: !!activeConversationId,
  });

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Setup Socket Listeners
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

  // Select Conversation
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
    <div className="flex h-[calc(100vh-10rem)] min-h-[580px] max-h-[800px] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in duration-300">
      
      {/* Sidebar: Conversations List */}
      <div className="w-1/3 border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-w-[280px]">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Messages</h2>
            
            {/* Live Socket Status Dot */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-extrabold">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span className={isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {isConnected ? 'Live Connected' : 'Live Sync'}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] placeholder:text-slate-400 pl-9 pr-4 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all border border-transparent focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Conversations Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
              <span className="text-xs text-[var(--muted-foreground)] font-medium">Loading chats...</span>
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)] text-xs leading-relaxed">
              No conversations found. Initiate a booking or inquiry to start chatting in real-time.
            </div>
          ) : (
            filteredConversations?.map((conv) => {
              const latestMsg = conv.messages[0];
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full p-4 flex items-start gap-3.5 text-left transition-all relative ${
                    isActive 
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-l-[var(--primary)]' 
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conv.partner.avatarUrl ? (
                      <img src={conv.partner.avatarUrl} alt="Avatar" className="w-11 h-11 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm font-bold text-sm">
                        {conv.partner.firstName.charAt(0)}{conv.partner.lastName.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  </div>

                  {/* Conv Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-extrabold text-xs text-[var(--foreground)] truncate">
                        {conv.partner.firstName} {conv.partner.lastName}
                      </h3>
                      {latestMsg && (
                        <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap ml-2 font-medium">
                          {formatDistanceToNow(new Date(latestMsg.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800 text-[var(--muted-foreground)]">
                        {conv.partner.role}
                      </span>
                    </div>

                    {latestMsg ? (
                      <p className={`text-xs truncate ${!latestMsg.isRead && latestMsg.senderId !== currentUserId ? 'font-black text-indigo-600 dark:text-indigo-400' : 'text-[var(--muted-foreground)]'}`}>
                        {latestMsg.senderId === currentUserId ? 'You: ' : ''}{latestMsg.content}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)] italic">Start conversation</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/30">
        {activeConversationId && activeConversation ? (
          <>
            {/* Active Chat Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {activeConversation.partner.avatarUrl ? (
                  <img src={activeConversation.partner.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                    {activeConversation.partner.firstName.charAt(0)}{activeConversation.partner.lastName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                    {activeConversation.partner.firstName} {activeConversation.partner.lastName}
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)] capitalize font-medium">
                    Verified {activeConversation.partner.role.toLowerCase()} &bull; <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                  </p>
                </div>
              </div>

              <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-extrabold">
                Encrypted Session
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : activeMessages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)] text-xs gap-2">
                  <MessageSquare className="w-8 h-8 text-indigo-400/50" />
                  <span>Send a message to start the real-time conversation!</span>
                </div>
              ) : (
                activeMessages?.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl shadow-sm text-xs leading-relaxed ${
                          isMe 
                            ? 'bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white rounded-br-xs font-medium' 
                            : 'bg-white dark:bg-slate-800 text-[var(--foreground)] rounded-bl-xs border border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 mx-1">
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-indigo-500" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] placeholder:text-slate-400 border border-transparent focus:border-[var(--primary)] rounded-2xl px-4 py-3 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-foreground)] p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mb-5 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-[var(--foreground)] mb-2">Instant Messenger</h3>
            <p className="max-w-sm text-xs leading-relaxed">
              Select a conversation from the left sidebar to view messages and interact with landlords and tenants in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
