'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, User, MessageSquare } from 'lucide-react';
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
      // If this message belongs to the currently active conversation, update the UI
      if (message.conversationId === activeConversationId) {
        queryClient.setQueryData(['messages', activeConversationId], (oldData: Message[] | undefined) => {
          if (!oldData) return [message];
          // Prevent duplicates
          if (oldData.find(m => m.id === message.id)) return oldData;
          return [...oldData, message];
        });
      }

      // Update the conversations list preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, currentUserId, activeConversationId, queryClient]);

  // Join conversation room when clicking a chat
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

    // Emit via socket for realtime delivery
    socket.emit('send_message', messagePayload);
    setNewMessage('');
  };

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[550px] max-h-[750px] glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
      
      {/* Sidebar: Conversations List */}
      <div className="w-1/3 border-r border-[var(--border)] flex flex-col bg-white/5 dark:bg-slate-900/50 min-w-[260px]">
        <div className="p-4 border-b border-[var(--border)] shrink-0 bg-white/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Messages</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
            </div>
          ) : conversations?.length === 0 ? (
            <div className="p-6 text-center text-[var(--muted-foreground)] text-sm">
              No conversations yet. Book a property or contact a landlord to start chatting.
            </div>
          ) : (
            conversations?.map((conv) => {
              const latestMsg = conv.messages[0];
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full p-4 flex items-start gap-4 text-left transition-colors border-b border-[var(--border)] ${isActive ? 'bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {conv.partner.avatarUrl ? (
                    <img src={conv.partner.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-[var(--foreground)] truncate">{conv.partner.firstName} {conv.partner.lastName}</h3>
                      {latestMsg && (
                        <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(latestMsg.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {latestMsg ? (
                      <p className={`text-xs truncate ${!latestMsg.isRead && latestMsg.senderId !== currentUserId ? 'font-bold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                        {latestMsg.senderId === currentUserId ? 'You: ' : ''}{latestMsg.content}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)] italic">New conversation</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#1C1A1B]">
        {activeConversationId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[var(--border)] bg-white dark:bg-[#2A2A2B] flex items-center gap-4 shadow-sm shrink-0">
              {activeConversation.partner.avatarUrl ? (
                <img src={activeConversation.partner.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-[var(--foreground)]">{activeConversation.partner.firstName} {activeConversation.partner.lastName}</h3>
                <p className="text-xs text-[var(--muted-foreground)] capitalize">{activeConversation.partner.role.toLowerCase()}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : activeMessages?.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[var(--muted-foreground)] text-sm">
                  Send a message to start the conversation!
                </div>
              ) : (
                activeMessages?.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-[var(--primary)] text-white rounded-br-none' : 'bg-white dark:bg-[#2A2A2B] text-[var(--foreground)] rounded-bl-none border border-[var(--border)] shadow-sm'}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)] mt-1 mx-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-[#2A2A2B] border-t border-[var(--border)] shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-100 dark:bg-[#1C1A1B] text-[var(--foreground)] border border-transparent focus:border-[var(--primary)] rounded-full px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg hover:shadow-indigo-500/30"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-foreground)] p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Your Messages</h3>
            <p className="max-w-md text-sm">Select a conversation from the sidebar to view chat history and send messages in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
