'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Loader2,
  MessageSquare,
  Search,
  CheckCheck,
  Lock,
  ShieldCheck,
  Mic,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Play,
  Pause,
  Download,
  X,
  RefreshCw,
  ArrowLeft,
  Shield,
  Zap,
  Radio,
  Building2,
  CalendarCheck,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format, isSameDay } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  isVerifiedLandlord?: boolean;
  phoneNumber?: string | null;
  ghanaCardStatus?: string | null;
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

interface ContextProperty {
  id: string;
  title: string;
  location: string;
}

interface ContextBooking {
  id: string;
  status: string;
  roomType?: string | null;
  property?: ContextProperty | null;
}

interface Conversation {
  id: string;
  tenantId: string;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  messages: Message[];
  partner: Partner;
  contextBooking?: ContextBooking | null;
  contextProperty?: ContextProperty | null;
}

function formatDateDivider(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM yyyy');
}

// ── CUSTOM VOICE NOTE PLAYER COMPONENT ──
function AudioVoiceNotePlayer({
  src,
  duration,
  isMine,
}: {
  src: string;
  duration?: number | null;
  isMine: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number>(0);
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

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setLoadedDuration(Math.round(audioRef.current.duration));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const totalDuration = duration || loadedDuration || 0;

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-2.5 rounded-xl min-w-[210px] max-w-[280px]',
        isMine
          ? 'bg-black/20 text-white'
          : 'bg-[#E7E7DF]/70 dark:bg-[#222925] text-[#242925] dark:text-white'
      )}
    >
      <audio
        ref={audioRef}
        src={getImageUrl(src)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs',
          isMine
            ? 'bg-white text-[#173D32] hover:bg-zinc-100'
            : 'bg-[#173D32] text-white hover:bg-[#1E4F41]'
        )}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono opacity-85">
          <span>{formatSecs(currentTime)}</span>
          <span>{totalDuration ? formatSecs(totalDuration) : 'Voice Note'}</span>
        </div>
        <div className="w-full bg-black/20 dark:bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full transition-all duration-150',
              isMine ? 'bg-white' : 'bg-[#173D32] dark:bg-emerald-400'
            )}
            style={{
              width: `${totalDuration ? Math.min(100, (currentTime / totalDuration) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MessagesWorkspace() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const paramConversationId = searchParams.get('conversationId');
  const paramPartnerId = searchParams.get('partnerId');

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    paramConversationId || null
  );
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'BOOKINGS'>('ALL');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('TENANT');
  const [isSending, setIsSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Attachments & Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingSecondsRef = useRef<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSelectedRef = useRef(false);
  const handledPartnerIdRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data?.user) {
          setCurrentUserId(res.data.user.id);
          setCurrentUserRole(res.data.user.role || 'TENANT');
        }
      })
      .catch(() => {});
  }, []);

  // 1. Fetch Conversations
  const {
    data: conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
    refetchInterval: 8000,
  });

  // Handle ?conversationId= or ?partnerId= deep links and desktop initial auto-selection
  useEffect(() => {
    if (!conversations) return;

    if (paramConversationId) {
      const exists = conversations.find((c) => c.id === paramConversationId);
      if (exists && activeConversationId !== paramConversationId) {
        setActiveConversationId(paramConversationId);
        hasAutoSelectedRef.current = true;
        return;
      }
    }

    if (paramPartnerId && handledPartnerIdRef.current !== paramPartnerId) {
      handledPartnerIdRef.current = paramPartnerId;
      const existingWithPartner = conversations.find(
        (c) => c.partner?.id === paramPartnerId || c.landlordId === paramPartnerId || c.tenantId === paramPartnerId
      );
      if (existingWithPartner) {
        setActiveConversationId(existingWithPartner.id);
        hasAutoSelectedRef.current = true;
        return;
      }
      // Create or resolve conversation with this partner
      api
        .post('/chat/conversations', { partnerId: paramPartnerId })
        .then((res) => {
          if (res.data?.id) {
            setActiveConversationId(res.data.id);
            hasAutoSelectedRef.current = true;
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        })
        .catch(() => {});
      return;
    }

    // Auto-select most recent conversation on desktop if none selected yet
    if (
      !hasAutoSelectedRef.current &&
      !activeConversationId &&
      conversations.length > 0 &&
      typeof window !== 'undefined' &&
      window.innerWidth >= 768
    ) {
      setActiveConversationId(conversations[0].id);
      hasAutoSelectedRef.current = true;
    }
  }, [conversations, paramConversationId, paramPartnerId, activeConversationId, queryClient]);

  // Join socket room whenever activeConversationId changes
  useEffect(() => {
    if (socket && activeConversationId) {
      socket.emit('join_conversation', activeConversationId);
    }
    setIsPartnerTyping(false);
  }, [socket, activeConversationId]);

  // 2. Fetch Messages for Active Thread
  const {
    data: activeMessages,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery<Message[]>({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data } = await api.get(`/chat/${activeConversationId}/messages`);
      // Refresh conversation list unread count once messages are fetched & marked read
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return data;
    },
    enabled: !!activeConversationId,
    refetchInterval: 6000,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isPartnerTyping]);

  // Socket listeners for live messages, read receipts, and typing indicators
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        setIsPartnerTyping(false);
        queryClient.setQueryData(
          ['messages', activeConversationId],
          (oldData: Message[] | undefined) => {
            if (!oldData) return [message];
            if (oldData.some((m) => m.id === message.id)) return oldData;
            // Remove any matching optimistic temp message from current user
            const filtered = oldData.filter(
              (m) =>
                !(
                  m.id.startsWith('temp-') &&
                  m.senderId === message.senderId &&
                  m.content === message.content
                )
            );
            return [...filtered, message];
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleMessagesRead = (payload: { conversationId: string; readerId: string }) => {
      if (payload.conversationId === activeConversationId && payload.readerId !== currentUserId) {
        queryClient.setQueryData(
          ['messages', activeConversationId],
          (oldData: Message[] | undefined) => {
            if (!oldData) return [];
            return oldData.map((m) =>
              m.senderId === currentUserId ? { ...m, isRead: true } : m
            );
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleTyping = (payload: { senderId: string }) => {
      if (payload.senderId !== currentUserId) {
        setIsPartnerTyping(true);
      }
    };

    const handleStopTyping = (payload: { senderId: string }) => {
      if (payload.senderId !== currentUserId) {
        setIsPartnerTyping(false);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, currentUserId, activeConversationId, queryClient]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const activeConversation = useMemo(() => {
    return conversations?.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Emit typing events when user types
  const handleInputChange = (val: string) => {
    setNewMessage(val);
    if (!socket || !activeConversationId || !activeConversation?.partner?.id) return;

    socket.emit('typing', {
      conversationId: activeConversationId,
      receiverId: activeConversation.partner.id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversationId: activeConversationId,
        receiverId: activeConversation.partner.id,
      });
    }, 2000);
  };

  // ── VOICE RECORDING CONTROLS (Fixed Closure Bug via recordingSecondsRef) ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recordingSecondsRef.current = 0;
      setRecordingTime(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const finalDuration = Math.max(1, recordingSecondsRef.current);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadAndSendMedia(audioBlob, 'voice_note.webm', 'AUDIO', finalDuration);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingTime(recordingSecondsRef.current);
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
      recordingSecondsRef.current = 0;
      setRecordingTime(0);
    }
  };

  // ── MEDIA UPLOAD & SEND HELPER (Always Persists via REST + Broadcasts via Socket) ──
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
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mediaUrl = uploadRes.data.url;

      const payload = {
        content:
          mediaType === 'AUDIO'
            ? '🎤 Voice note'
            : mediaType === 'IMAGE'
            ? '📷 Photo attachment'
            : `📄 ${fileName || 'Document'}`,
        mediaUrl,
        mediaType,
        fileName,
        duration,
      };

      const res = await api.post(`/chat/${activeConversationId}/messages`, payload);
      if (res.data) {
        queryClient.setQueryData(
          ['messages', activeConversationId],
          (old: Message[] | undefined) => {
            if (!old) return [res.data];
            if (old.some((m) => m.id === res.data.id)) return old;
            return [...old, res.data];
          }
        );
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

  // ── SEND TEXT MESSAGE (Guaranteed REST Persistence + Optimistic UI + Push + Socket) ──
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !currentUserId || !activeConversation || isSending) {
      return;
    }

    const trimmed = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    if (socket && activeConversation.partner?.id) {
      socket.emit('stop_typing', {
        conversationId: activeConversationId,
        receiverId: activeConversation.partner.id,
      });
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: currentUserId,
      content: trimmed,
      mediaType: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(
      ['messages', activeConversationId],
      (old: Message[] | undefined) => (old ? [...old, optimisticMsg] : [optimisticMsg])
    );

    try {
      const res = await api.post(`/chat/${activeConversationId}/messages`, {
        content: trimmed,
        mediaType: 'TEXT',
      });
      if (res.data) {
        queryClient.setQueryData(
          ['messages', activeConversationId],
          (old: Message[] | undefined) => {
            if (!old) return [res.data];
            const withoutTemp = old.filter((m) => m.id !== tempId && m.id !== res.data.id);
            return [...withoutTemp, res.data];
          }
        );
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      queryClient.setQueryData(
        ['messages', activeConversationId],
        (old: Message[] | undefined) => (old ? old.filter((m) => m.id !== tempId) : [])
      );
      setNewMessage(trimmed);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // ── FILTERED CONVERSATIONS ──
  const totalUnreadThreads = useMemo(() => {
    if (!conversations) return 0;
    return conversations.filter((c) => {
      if (typeof c.unreadCount === 'number') return c.unreadCount > 0;
      const lastMsg = c.messages?.[0];
      return Boolean(lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.isRead);
    }).length;
  }, [conversations, currentUserId]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const q = searchQuery.trim().toLowerCase();

    return conversations.filter((c) => {
      if (q) {
        const fullName = `${c.partner?.firstName || ''} ${c.partner?.lastName || ''}`.toLowerCase();
        const propTitle = (
          c.contextBooking?.property?.title ||
          c.contextProperty?.title ||
          ''
        ).toLowerCase();
        if (!fullName.includes(q) && !propTitle.includes(q)) return false;
      }

      if (activeFilter === 'UNREAD') {
        if (typeof c.unreadCount === 'number') return c.unreadCount > 0;
        const lastMsg = c.messages?.[0];
        return Boolean(lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.isRead);
      }

      if (activeFilter === 'BOOKINGS') {
        return Boolean(c.contextBooking);
      }

      return true;
    });
  }, [conversations, searchQuery, activeFilter, currentUserId]);

  // ── FORMAT PREVIEW HELPER ──
  const renderLastMessagePreview = (msg?: Message) => {
    if (!msg) return <span className="text-[#6F756F] dark:text-[#9CA59E] italic">No messages yet</span>;

    const contentLower = (msg.content || '').toLowerCase();
    const isVoice = msg.mediaType === 'AUDIO' || contentLower.includes('voice note');
    const isImage = msg.mediaType === 'IMAGE' || contentLower.includes('photo');
    const isDoc = msg.mediaType === 'DOCUMENT' || contentLower.includes('document');

    if (isVoice) {
      return (
        <span className="inline-flex items-center gap-1 text-[#173D32] dark:text-emerald-400 font-semibold">
          <Mic className="w-3 h-3 shrink-0" />
          <span>Voice note {msg.duration ? `(${msg.duration}s)` : ''}</span>
        </span>
      );
    }

    if (isImage) {
      return (
        <span className="inline-flex items-center gap-1 text-[#173D32] dark:text-emerald-400 font-semibold">
          <ImageIcon className="w-3 h-3 shrink-0" />
          <span>Photo attachment</span>
        </span>
      );
    }

    if (isDoc) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
          <FileText className="w-3 h-3 shrink-0" />
          <span>{msg.fileName || 'Document'}</span>
        </span>
      );
    }

    const clean = msg.content.replace(/^(\?+)\s*/, '');
    return <span className="truncate">{clean}</span>;
  };

  const activeProperty =
    activeConversation?.contextBooking?.property || activeConversation?.contextProperty || null;
  const activeBooking = activeConversation?.contextBooking || null;
  const bookingDetailHref = activeBooking
    ? currentUserRole === 'LANDLORD'
      ? `/dashboard/landlord/bookings/${activeBooking.id}`
      : `/dashboard/tenant/bookings/${activeBooking.id}`
    : null;

  return (
    <div className="w-full space-y-4 pb-8 min-w-0">
      {/* Hidden File Upload Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={documentInputRef}
        onChange={handleDocumentSelect}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Direct Tenancy Inbox
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white truncate">
            Messages {totalUnreadThreads > 0 ? `(${totalUnreadThreads} Unread)` : ''}
          </h1>
          <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
            Coordinate room viewings, lease agreements, and check-in arrangements directly with verified hosts.
          </p>
        </div>

        {/* Live Socket Status & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] text-xs font-semibold">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-[#16A34A] animate-pulse' : 'bg-amber-500'
              )}
            />
            <span className={isConnected ? 'text-[#173D32] dark:text-emerald-400' : 'text-[#6F756F]'}>
              {isConnected ? 'Live Connected' : 'Syncing...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              refetchConversations();
              if (activeConversationId) refetchMessages();
              toast.success('Messages refreshed');
            }}
            className="p-2 border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] hover:bg-[#F3F4F1] dark:hover:bg-[#1E2521] text-[#5E645E] dark:text-[#A0A8A2] rounded-xl transition cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MASTER-DETAIL CARD CONTAINER ── */}
      <div className="w-full max-w-full min-w-0 bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-14.5rem)] min-h-[600px] max-h-[820px]">
        {/* ── LEFT COLUMN: THREAD LIST ── */}
        <div
          className={clsx(
            'w-full md:w-80 lg:w-[340px] border-r border-[#E7E7DF] dark:border-[#262E29] flex flex-col shrink-0 min-w-0 bg-[#FBFBF9] dark:bg-[#131715]',
            activeConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] shrink-0 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F756F] pointer-events-none" />
              <input
                type="text"
                placeholder="Search host or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8F7F2] dark:bg-[#121614] border border-[#E7E7DF] dark:border-[#262E29] rounded-xl text-xs font-medium text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:bg-white dark:focus:bg-[#171C19] focus:border-[#173D32] outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F756F] hover:text-[#242925] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              {(
                [
                  { key: 'ALL', label: `All (${conversations?.length || 0})` },
                  { key: 'UNREAD', label: `Unread (${totalUnreadThreads})` },
                  { key: 'BOOKINGS', label: 'Active Bookings' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap cursor-pointer',
                    activeFilter === tab.key
                      ? 'bg-[#173D32] text-white'
                      : 'bg-[#F3F4F1] dark:bg-[#212824] text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#242925] dark:hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll View */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E7E7DF]/70 dark:divide-[#262E29]">
            {isLoadingConversations ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-[#6F756F]">
                <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[#C5C8C1] dark:text-[#333D37] mx-auto" />
                <p className="text-xs font-semibold text-[#242925] dark:text-white">
                  No conversations found
                </p>
                <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] leading-relaxed">
                  {searchQuery || activeFilter !== 'ALL'
                    ? 'Try clearing your search or switching back to All conversations.'
                    : 'Click "Message Host" on any property or booking to start a conversation.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConversationId;
                const lastMessage = c.messages?.[0];
                const unreadCount =
                  typeof c.unreadCount === 'number'
                    ? c.unreadCount
                    : lastMessage && lastMessage.senderId !== currentUserId && !lastMessage.isRead
                    ? 1
                    : 0;
                const hasUnread = unreadCount > 0;
                const threadProperty = c.contextBooking?.property || c.contextProperty;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={clsx(
                      'w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer relative',
                      isActive
                        ? 'bg-[#EEF4F0] dark:bg-[#1C2822] border-l-4 border-[#173D32]'
                        : 'hover:bg-[#F3F4F1] dark:hover:bg-[#1A201D]'
                    )}
                  >
                    {/* Partner Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#222925] border border-[#E7E7DF] dark:border-[#2E3832] flex items-center justify-center text-xs font-bold text-[#173D32] dark:text-emerald-400 overflow-hidden">
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
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#131715]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <h4
                            className={clsx(
                              'text-xs truncate',
                              hasUnread
                                ? 'font-bold text-[#181C19] dark:text-white'
                                : 'font-semibold text-[#242925] dark:text-[#E2E6E3]'
                            )}
                          >
                            {c.partner?.firstName} {c.partner?.lastName}
                          </h4>
                          {c.partner?.isVerifiedLandlord && (
                            <ShieldCheck
                              className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400 shrink-0"
                              aria-label="Verified Landlord"
                            />
                          )}
                        </div>
                        {lastMessage && (
                          <span className="text-[10px] text-[#6F756F] dark:text-[#9CA59E] shrink-0">
                            {formatDistanceToNow(new Date(lastMessage.createdAt), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>

                      {/* Property / Booking Context Subtitle */}
                      <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        {threadProperty ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#557A67] dark:text-[#86B59C] truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{threadProperty.title}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E]">
                            {c.partner?.role === 'LANDLORD' ? 'Property Host' : 'Resident'}
                          </span>
                        )}
                        {c.contextBooking && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-[#ECFDF3] text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-300 shrink-0">
                            {c.contextBooking.status}
                          </span>
                        )}
                      </div>

                      <p
                        className={clsx(
                          'text-[11px] truncate',
                          hasUnread
                            ? 'font-semibold text-[#242925] dark:text-white'
                            : 'text-[#6F756F] dark:text-[#9CA59E]'
                        )}
                      >
                        {renderLastMessagePreview(lastMessage)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: ACTIVE CHAT OR EMPTY STATE ── */}
        <div
          className={clsx(
            'flex-1 flex flex-col min-w-0 max-w-full overflow-hidden bg-white dark:bg-[#171C19]',
            !activeConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="w-full max-w-full min-w-0 px-4 sm:px-5 py-3.5 border-b border-[#E7E7DF] dark:border-[#262E29] flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#171C19]">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 -ml-1.5 text-[#5E645E] hover:text-[#242925] dark:hover:text-white rounded-lg cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F1] dark:bg-[#222925] border border-[#E7E7DF] dark:border-[#2E3832] flex items-center justify-center text-xs font-bold text-[#173D32] dark:text-emerald-400 overflow-hidden shrink-0">
                    {activeConversation.partner?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(activeConversation.partner.avatarUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      `${activeConversation.partner?.firstName?.[0] || 'U'}${
                        activeConversation.partner?.lastName?.[0] || ''
                      }`
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#242925] dark:text-white truncate">
                        {activeConversation.partner?.firstName}{' '}
                        {activeConversation.partner?.lastName}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3F4F1] dark:bg-[#222925] text-[#173D32] dark:text-emerald-400 border border-[#E7E7DF] dark:border-[#2E3832] shrink-0">
                        {activeConversation.partner?.role === 'LANDLORD' ? 'Host' : 'Resident'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#6F756F] dark:text-[#9CA59E] mt-0.5 truncate">
                      {activeConversation.partner?.isVerifiedLandlord ? (
                        <span className="inline-flex items-center gap-1 text-[#166534] dark:text-emerald-400 font-medium shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Landlord</span>
                        </span>
                      ) : (
                        <span className="shrink-0">Direct Tenancy Channel</span>
                      )}
                      {activeConversation.partner?.phoneNumber && (
                        <>
                          <span>&bull;</span>
                          <a
                            href={`tel:${activeConversation.partner.phoneNumber}`}
                            className="inline-flex items-center gap-1 text-[#242925] dark:text-white hover:underline font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{activeConversation.partner.phoneNumber}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Context Actions (View Property / View Booking) */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeProperty && (
                    <Link
                      href={`/properties/${activeProperty.id}`}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E7DF] dark:border-[#262E29] bg-[#F8F7F2] dark:bg-[#1E2521] hover:border-[#173D32] text-xs font-semibold text-[#242925] dark:text-white transition"
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#557A67]" />
                      <span className="max-w-[140px] truncate">{activeProperty.title}</span>
                      <ExternalLink className="w-3 h-3 text-[#6F756F]" />
                    </Link>
                  )}

                  {bookingDetailHref && (
                    <Link
                      href={bookingDetailHref}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173D32] hover:bg-[#1E4F41] text-white text-xs font-semibold transition"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Booking ({activeBooking?.status})</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Escrow Advisory Banner */}
              <div className="w-full max-w-full min-w-0 px-4 sm:px-5 py-2 bg-[#FFFAEB] dark:bg-[#451A03]/25 border-b border-[#FDE68A] dark:border-[#78350F]/60 flex items-center justify-between gap-2 text-[11px] text-[#92400E] dark:text-[#FCD34D]">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span className="truncate">
                    <strong>Escrow Protection:</strong> Keep all rent and deposit payments inside
                    AkwaabaHomes checkout. Never send cash or direct transfers offline.
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-3 bg-[#FBFBF9] dark:bg-[#131715]">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
                  </div>
                ) : activeMessages?.length === 0 ? (
                  <div className="text-center text-xs text-[#6F756F] dark:text-[#9CA59E] py-16 space-y-2">
                    <p className="font-semibold text-sm text-[#242925] dark:text-white">
                      Start your conversation with {activeConversation.partner?.firstName}
                    </p>
                    <p>
                      Ask about room availability, utilities, inspection dates, or select a quick
                      prompt below.
                    </p>
                  </div>
                ) : (
                  activeMessages?.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId;
                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const showDateDivider =
                      !prevMsg ||
                      !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-0.5 rounded-full bg-[#ECEEE9] dark:bg-[#222925] text-[10px] font-semibold text-[#5E645E] dark:text-[#A0A8A2]">
                              {formatDateDivider(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={clsx(
                            'flex flex-col w-full min-w-0',
                            isMine ? 'items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={clsx(
                              'max-w-[85%] sm:max-w-[70%] min-w-0 break-words px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed space-y-2',
                              isMine
                                ? 'bg-[#173D32] text-white rounded-tr-xs shadow-2xs'
                                : 'bg-white dark:bg-[#1E2521] text-[#242925] dark:text-white rounded-tl-xs border border-[#E7E7DF] dark:border-[#2A332E]'
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
                                <FileText className="w-5 h-5 shrink-0 text-amber-400" />
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-semibold text-xs truncate">
                                    {msg.fileName || 'Document'}
                                  </p>
                                  <span className="text-[10px] opacity-75 truncate block">
                                    Click to open / download
                                  </span>
                                </div>
                                <Download className="w-4 h-4 shrink-0" />
                              </a>
                            )}

                            {/* 4. TEXT CONTENT */}
                            {msg.content && msg.mediaType !== 'AUDIO' && (
                              <p className="whitespace-pre-wrap break-words">
                                {msg.content.replace(/^(\?+)\s*/, '')}
                              </p>
                            )}
                          </div>

                          {/* Timestamp & Read Receipts */}
                          <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[#6F756F] dark:text-[#9CA59E]">
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <CheckCheck
                                className={clsx(
                                  'w-3.5 h-3.5',
                                  msg.isRead
                                    ? 'text-[#16A34A] dark:text-emerald-400'
                                    : 'text-[#9CA59E]'
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}

                {/* Live Typing Indicator */}
                {isPartnerTyping && (
                  <div className="flex items-center gap-2 text-xs text-[#5E645E] dark:text-[#A0A8A2] pl-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#1E2521] border border-[#E7E7DF] dark:border-[#2A332E] text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-bounce [animation-delay:300ms]" />
                      <span className="ml-1">
                        {activeConversation.partner?.firstName} is typing...
                      </span>
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="w-full max-w-full min-w-0 px-4 py-2 bg-white dark:bg-[#171C19] border-t border-[#E7E7DF] dark:border-[#262E29] flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
                <span className="text-[10px] font-semibold text-[#6F756F] dark:text-[#9CA59E] uppercase tracking-wider shrink-0 mr-1">
                  Quick Prompts:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {[
                    'Is this room available for the upcoming term?',
                    'When can I schedule a physical viewing?',
                    'Are water and prepaid ECG meter dedicated?',
                    'What utilities are included in the rent?',
                    'I have completed signing the lease agreement.',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleInputChange(chip)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#F8F7F2] dark:bg-[#1E2521] border border-[#E7E7DF] dark:border-[#2A332E] text-[#242925] dark:text-[#E2E6E3] hover:border-[#173D32] hover:text-[#173D32] dark:hover:text-emerald-400 whitespace-nowrap transition cursor-pointer shrink-0"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Recording Overlay */}
              {isRecording ? (
                <div className="p-3 border-t border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Recording Voice Note ({recordingTime}s)...</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#222925] border border-[#E7E7DF] dark:border-[#2E3832] text-[#242925] dark:text-white text-xs font-semibold hover:bg-zinc-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Voice Note</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Rich Input Bar */
                <div className="w-full max-w-full min-w-0 p-3 sm:p-3.5 border-t border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] shrink-0">
                  <form
                    onSubmit={handleSendMessage}
                    className="w-full max-w-full min-w-0 flex gap-2 items-center"
                  >
                    {/* Photo upload */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#173D32] dark:hover:text-emerald-400 hover:bg-[#F3F4F1] dark:hover:bg-[#1E2521] transition cursor-pointer shrink-0"
                      title="Attach photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Document upload */}
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#173D32] dark:hover:text-emerald-400 hover:bg-[#F3F4F1] dark:hover:bg-[#1E2521] transition cursor-pointer shrink-0"
                      title="Attach document (PDF)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Mic button */}
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isUploading}
                      className="p-2 rounded-xl text-[#5E645E] dark:text-[#A0A8A2] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-[#1E2521] transition cursor-pointer shrink-0"
                      title="Record voice note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Text field */}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={`Write a message to ${
                        activeConversation.partner?.firstName || 'host'
                      }...`}
                      className="flex-1 min-w-0 bg-[#F8F7F2] dark:bg-[#121614] text-xs font-medium text-[#242925] dark:text-white placeholder:text-[#6F756F] border border-[#E7E7DF] dark:border-[#262E29] rounded-xl px-4 py-2.5 outline-none focus:border-[#173D32] transition"
                    />

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isUploading || isSending}
                      className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#173D32] hover:bg-[#1E4F41] text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* ── EMPTY STATE (NO SELECTION) ── */
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-6 bg-[#FBFBF9] dark:bg-[#131715]">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF4F0] dark:bg-[#1C2822] text-[#173D32] dark:text-emerald-400 border border-[#CFE0D6] dark:border-[#253D31] flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>

              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-bold text-[#242925] dark:text-white">
                  Select a Conversation
                </h3>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                  Choose a thread from the left panel to coordinate lease agreements, room
                  inspections, or move-in handover details.
                </p>
              </div>

              {/* 3 Value Proposition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left pt-2">
                <div className="p-3.5 rounded-xl border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#242925] dark:text-white">
                    <Shield className="w-3.5 h-3.5 text-[#173D32] dark:text-emerald-400" />
                    <span>Escrow Protected</span>
                  </div>
                  <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] leading-relaxed">
                    Rent and deposits stay protected in escrow until physical key check-in.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#242925] dark:text-white">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Real-Time Delivery</span>
                  </div>
                  <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] leading-relaxed">
                    Instant message delivery with live typing indicators and read receipts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#242925] dark:text-white">
                    <Radio className="w-3.5 h-3.5 text-[#557A67]" />
                    <span>Voice &amp; Documents</span>
                  </div>
                  <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] leading-relaxed">
                    Send voice notes, room photos, and tenancy documents in one place.
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

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-20">
          <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
        </div>
      }
    >
      <MessagesWorkspace />
    </Suspense>
  );
}
