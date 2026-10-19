'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Loader2,
  User,
  MessageSquare,
  Search,
  CheckCheck,
  Lock,
  ShieldCheck,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Play,
  Pause,
  Download,
  X,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Shield,
  Zap,
  Radio
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | string | null;
  fileName?: string | null;
  duration?: number | null;
  isRead: boolean;
  createdAt: string;
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

// ── CUSTOM VOICE NOTE PLAYER COMPONENT ──
function AudioVoiceNotePlayer({ src, duration, isMine }: { src: string; duration?: number | null; isMine: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.error('Unable to play audio recording');
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const totalDuration = duration || (audioRef.current?.duration ? Math.round(audioRef.current.duration) : 0);

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-2.5 rounded-xl min-w-[210px] max-w-[280px]',
        isMine ? 'bg-black/20 text-white' : 'bg-zinc-200/70 dark:bg-zinc-700/50 text-zinc-900 dark:text-white'
      )}
    >
      <audio
        ref={audioRef}
        src={getImageUrl(src)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs',
          isMine
            ? 'bg-white text-[#0F5132] hover:bg-zinc-100'
            : 'bg-[#0F5132] text-white hover:bg-[#0A3D24]'
        )}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
          <span>{formatSecs(currentTime)}</span>
          <span>{totalDuration ? formatSecs(totalDuration) : 'Voice Note'}</span>
        </div>
        <div className="w-full bg-black/20 dark:bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div
            className={clsx('h-full transition-all duration-150', isMine ? 'bg-white' : 'bg-[#0F5132] dark:bg-emerald-400')}
            style={{ width: `${totalDuration ? Math.min(100, (currentTime / totalDuration) * 100) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TENANT' | 'LANDLORD' | 'UNREAD'>('ALL');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Attachments & Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    api.get('/auth/me').then((res) => {
      setCurrentUserId(res.data.user.id);
    });
  }, []);

  // 1. Fetch Conversations
  const { data: conversations, isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
    refetchInterval: 8000
  });

  // 2. Fetch Messages for Active Thread
  const { data: activeMessages, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data } = await api.get(`/chat/${activeConversationId}/messages`);
      return data;
    },
    enabled: !!activeConversationId,
    refetchInterval: 5000
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Socket listener for live message arrivals
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        queryClient.setQueryData(['messages', activeConversationId], (oldData: Message[] | undefined) => {
          if (!oldData) return [message];
          if (oldData.find((m) => m.id === message.id)) return oldData;
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

  const activeConversation = useMemo(() => {
    return conversations?.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // ── VOICE RECORDING CONTROLS ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadAndSendMedia(audioBlob, 'voice_note.webm', 'AUDIO', Math.max(1, recordingTime));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone permission is required to record voice notes');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
  };

  // ── MEDIA UPLOAD & SEND HELPER ──
  const uploadAndSendMedia = async (
    file: File | Blob,
    fileName: string,
    mediaType: 'IMAGE' | 'AUDIO' | 'DOCUMENT',
    duration?: number
  ) => {
    if (!activeConversationId || !activeConversation) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      const uploadRes = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const mediaUrl = uploadRes.data.url;

      const payload = {
        conversationId: activeConversationId,
        receiverId: activeConversation.partner.id,
        content: mediaType === 'AUDIO' ? '🎤 Voice note' : mediaType === 'IMAGE' ? '📷 Photo attachment' : '📄 Document',
        mediaUrl,
        mediaType,
        fileName,
        duration
      };

      if (socket && isConnected) {
        socket.emit('send_message', payload);
      } else {
        const res = await api.post(`/chat/${activeConversationId}/messages`, payload);
        if (res.data) {
          queryClient.setQueryData(['messages', activeConversationId], (old: Message[] | undefined) => {
            return old ? [...old, res.data] : [res.data];
          });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      }
      toast.success(mediaType === 'AUDIO' ? 'Voice note sent' : 'Attachment sent');
    } catch (err: any) {
      console.error('Failed to upload media:', err);
      toast.error('Failed to send attachment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendMedia(file, file.name, 'IMAGE');
      e.target.value = '';
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendMedia(file, file.name, 'DOCUMENT');
      e.target.value = '';
    }
  };

  // ── SEND TEXT MESSAGE ──
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !currentUserId || !activeConversation) return;

    const trimmed = newMessage.trim();
    setNewMessage('');

    if (socket && isConnected) {
      const messagePayload = {
        conversationId: activeConversationId,
        receiverId: activeConversation.partner.id,
        content: trimmed,
        mediaType: 'TEXT'
      };
      socket.emit('send_message', messagePayload);
    } else {
      try {
        const res = await api.post(`/chat/${activeConversationId}/messages`, {
          content: trimmed,
          mediaType: 'TEXT'
        });
        if (res.data) {
          queryClient.setQueryData(['messages', activeConversationId], (old: Message[] | undefined) => {
            return old ? [...old, res.data] : [res.data];
          });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      } catch (err) {
        console.error('Failed to send message via REST fallback:', err);
        toast.error('Failed to send message');
      }
    }
  };

  // ── FILTERED CONVERSATIONS ──
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    return conversations.filter((c) => {
      const fullName = `${c.partner?.firstName || ''} ${c.partner?.lastName || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'TENANT') return c.partner?.role === 'TENANT';
      if (activeFilter === 'LANDLORD') return c.partner?.role === 'LANDLORD';
      if (activeFilter === 'UNREAD') {
        const lastMsg = c.messages?.[0];
        return lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.isRead;
      }

      return true;
    });
  }, [conversations, searchQuery, activeFilter, currentUserId]);

  // ── FORMAT PREVIEW HELPER (CLEANS "???? Voice note") ──
  const renderLastMessagePreview = (msg?: Message) => {
    if (!msg) return <span className="text-zinc-400 italic">No messages yet</span>;

    const contentLower = (msg.content || '').toLowerCase();
    const isVoice = msg.mediaType === 'AUDIO' || contentLower.includes('voice note');
    const isImage = msg.mediaType === 'IMAGE' || contentLower.includes('photo');
    const isDoc = msg.mediaType === 'DOCUMENT' || contentLower.includes('document');

    if (isVoice) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <Mic className="w-3 h-3 shrink-0" />
          <span>Voice note {msg.duration ? `(${msg.duration}s)` : ''}</span>
        </span>
      );
    }

    if (isImage) {
      return (
        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
          <ImageIcon className="w-3 h-3 shrink-0" />
          <span>Photo</span>
        </span>
      );
    }

    if (isDoc) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
          <FileText className="w-3 h-3 shrink-0" />
          <span>{msg.fileName || 'Document'}</span>
        </span>
      );
    }

    // Strip leading corrupted characters like '???? '
    const clean = msg.content.replace(/^(\?+)\s*/, '');
    return <span className="truncate">{clean}</span>;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300 min-w-0 overflow-hidden">
      
      {/* Hidden File Upload Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
      <input type="file" ref={documentInputRef} onChange={handleDocumentSelect} accept=".pdf,.doc,.docx" className="hidden" />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight truncate">
            Resident &amp; Host Communications
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Coordinate tenancy agreements, inspection viewings, and real-time inquiries securely.
          </p>
        </div>

        {/* Live Socket Status & Refresh */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-xs font-bold shadow-2xs">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
            />
            <span className={isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}>
              {isConnected ? 'Real-Time Connected' : 'Syncing...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              refetchConversations();
              if (activeConversationId) refetchMessages();
              toast.success('Inbox refreshed');
            }}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl transition cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MASTER-DETAIL CARD CONTAINER ── */}
      <div className="w-full max-w-full min-w-0 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-13rem)] min-h-[640px] max-h-[860px]">
        
        {/* ── LEFT COLUMN: THREAD LIST ── */}
        <div
          className={clsx(
            'w-full md:w-80 lg:w-[350px] border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 min-w-0 bg-zinc-50/40 dark:bg-zinc-900/20',
            activeConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] shrink-0 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
              {(
                [
                  { key: 'ALL', label: 'All' },
                  { key: 'TENANT', label: 'Tenants' },
                  { key: 'LANDLORD', label: 'Landlords' },
                  { key: 'UNREAD', label: 'Unread' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer',
                    activeFilter === tab.key
                      ? 'bg-[#0F5132] text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll View */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {isLoadingConversations ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
                <span>Loading message threads...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">No conversations found</p>
                <p className="text-[11px] text-zinc-400">
                  {searchQuery ? 'Try clearing your search query.' : 'New inquiries from tenants or hosts will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConversationId;
                const lastMessage = c.messages?.[0];
                const hasUnread = lastMessage && lastMessage.senderId !== currentUserId && !lastMessage.isRead;
                const partnerRole = c.partner?.role || 'USER';

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={clsx(
                      'w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer relative',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/25 border-l-4 border-[#0F5132]'
                        : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40'
                    )}
                  >
                    {/* Partner Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 overflow-hidden shadow-2xs">
                        {c.partner?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getImageUrl(c.partner.avatarUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          `${c.partner?.firstName?.[0] || 'U'}${c.partner?.lastName?.[0] || ''}`
                        )}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#12151D]" />
                      )}
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                          {c.partner?.firstName} {c.partner?.lastName}
                        </h4>
                        {lastMessage && (
                          <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={clsx(
                            'text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                            partnerRole === 'LANDLORD'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                              : partnerRole === 'TENANT'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          {partnerRole}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {renderLastMessagePreview(lastMessage)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: ACTIVE CHAT OR ARCHITECTURAL EMPTY STATE ── */}
        <div
          className={clsx(
            'flex-1 flex flex-col min-w-0 max-w-full overflow-hidden bg-white dark:bg-[#12151D]',
            !activeConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="w-full max-w-full min-w-0 px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#12151D]">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 -ml-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-white rounded-lg cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 overflow-hidden shadow-2xs shrink-0">
                    {activeConversation.partner?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(activeConversation.partner.avatarUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      `${activeConversation.partner?.firstName?.[0] || 'U'}${activeConversation.partner?.lastName?.[0] || ''}`
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                        {activeConversation.partner?.firstName} {activeConversation.partner?.lastName}
                      </h3>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[#0F5132] dark:text-emerald-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {activeConversation.partner?.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 truncate">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Verified Member</span>
                      <span>•</span>
                      <span className="truncate">Direct Tenancy Channel</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span>Encrypted</span>
                  </div>
                </div>
              </div>

              {/* Escrow Advisory Banner */}
              <div className="w-full max-w-full min-w-0 px-4 sm:px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-300">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="leading-snug">
                  <strong className="font-bold">Akwaaba Escrow Protected:</strong> Never make offline cash payments. Complete all rent and deposits via our secure checkout to protect your funds.
                </span>
              </div>

              {/* Messages Body */}
              <div className="flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
                  </div>
                ) : activeMessages?.length === 0 ? (
                  <div className="text-center text-xs text-zinc-400 py-16 space-y-2">
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">Start the conversation</p>
                    <p>Send a message, audio note, or choose one of the quick prompts below.</p>
                  </div>
                ) : (
                  activeMessages?.map((msg) => {
                    const isMine = msg.senderId === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        className={clsx(
                          'flex flex-col w-full min-w-0',
                          isMine ? 'items-end' : 'items-start'
                        )}
                      >
                        <div
                          className={clsx(
                            'max-w-[85%] sm:max-w-[70%] min-w-0 break-words p-3 rounded-2xl text-xs leading-relaxed space-y-2',
                            isMine
                              ? 'bg-[#0F5132] text-white font-medium rounded-tr-xs shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-xs border border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          {/* 1. IMAGE ATTACHMENT */}
                          {msg.mediaType === 'IMAGE' && msg.mediaUrl && (
                            <a
                              href={getImageUrl(msg.mediaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl overflow-hidden border border-white/20 hover:opacity-95 transition"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageUrl(msg.mediaUrl)}
                                alt="Attachment"
                                className="w-full max-h-64 object-cover rounded-lg"
                              />
                            </a>
                          )}

                          {/* 2. AUDIO VOICE NOTE */}
                          {msg.mediaType === 'AUDIO' && msg.mediaUrl && (
                            <AudioVoiceNotePlayer
                              src={msg.mediaUrl}
                              duration={msg.duration}
                              isMine={isMine}
                            />
                          )}

                          {/* 3. DOCUMENT ATTACHMENT */}
                          {msg.mediaType === 'DOCUMENT' && msg.mediaUrl && (
                            <a
                              href={getImageUrl(msg.mediaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-2.5 bg-black/15 dark:bg-white/10 rounded-xl hover:opacity-90 transition max-w-full min-w-0"
                            >
                              <FileText className="w-6 h-6 shrink-0 text-amber-400" />
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-bold text-xs truncate">{msg.fileName || 'Document'}</p>
                                <span className="text-[10px] opacity-75 truncate block">Click to view / download PDF</span>
                              </div>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          )}

                          {/* 4. TEXT CONTENT */}
                          {msg.content && msg.mediaType !== 'AUDIO' && (
                            <p className="whitespace-pre-wrap break-words">{msg.content.replace(/^(\?+)\s*/, '')}</p>
                          )}
                        </div>

                        {/* Timestamp & Seen Receipts */}
                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[9px] text-zinc-400">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && (
                            <CheckCheck
                              className={clsx('w-3.5 h-3.5', msg.isRead ? 'text-emerald-500' : 'text-zinc-400')}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="w-full max-w-full min-w-0 px-4 py-2 bg-zinc-50/70 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
                  Quick Prompts:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {[
                    'Is this room vacant for the next academic year?',
                    'When can I schedule a physical inspection?',
                    'Is water and prepaid ECG meter dedicated?',
                    'Can we negotiate on a flexible advance payment schedule?',
                    'Can I pay via Mobile Money Escrow?'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNewMessage(chip)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#0F5132] hover:text-[#0F5132] dark:hover:text-emerald-400 whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Recording Overlay */}
              {isRecording ? (
                <div className="p-3 border-t border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-3 animate-pulse shrink-0">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Recording Voice Note ({recordingTime}s)...</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Voice Note</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Rich Input Bar */
                <div className="w-full max-w-full min-w-0 p-3 sm:p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] shrink-0">
                  <form onSubmit={handleSendMessage} className="w-full max-w-full min-w-0 flex gap-2 items-center">
                    {/* Photo upload */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-zinc-500 hover:text-[#0F5132] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                      title="Attach photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Document upload */}
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-zinc-500 hover:text-[#0F5132] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                      title="Attach document (PDF)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Mic button */}
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                      title="Record voice note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Text field */}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${activeConversation.partner?.firstName || ''}...`}
                      className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800/60 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-[#0F5132] transition"
                    />

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isUploading}
                      className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold transition disabled:opacity-40 shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* ── ARCHITECTURAL EMPTY STATE (NO SELECTION) ── */
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                  Resident &amp; Host Communications
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Select a conversation from the left to coordinate lease terms, room viewings, maintenance queries, or move-in logistics.
                </p>
              </div>

              {/* 3 Value Proposition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left pt-2">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Shield className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span>Escrow Protected</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Rent and deposits are safely held in escrow until physical key check-in.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Real-Time Sync</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Instant delivery via authenticated WebSockets with delivery checks.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Rich Media</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Record voice notes, share room photos, and inspect agreements.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
