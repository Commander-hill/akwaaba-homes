'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import api from '@/lib/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Send,
  Loader2,
  MessageSquare,
  Search,
  CheckCheck,
  Check,
  Paperclip,
  FileText,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Pencil,
  Headphones,
  Users,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mic,
  Image as ImageIcon,
  Play,
  Pause,
  X,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useSearchParams } from 'next/navigation';
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
  propertyCard?: {
    title: string;
    location: string;
    status: string;
    image: string;
    href: string;
  } | null;
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
  category?: 'PROPERTY_TEAM' | 'MANAGEMENT' | 'OTHERS';
  isVerified?: boolean;
  online?: boolean;
  avatarIcon?: 'IMAGE' | 'HEADPHONES' | 'USERS';
}

type FilterTab = 'ALL' | 'PROPERTY_TEAM' | 'MANAGEMENT' | 'OTHERS';

// ── DEFAULT SHOWCASE CONVERSATIONS (Matching Reference Mockup Exactly) ──
const MOCKUP_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-chelsea',
    tenantId: 'stephen-akwaaba',
    landlordId: 'chelsea-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 1,
    category: 'PROPERTY_TEAM',
    isVerified: true,
    online: true,
    avatarIcon: 'IMAGE',
    partner: {
      id: 'chelsea-id',
      firstName: 'Carefree',
      lastName: 'Chelsea',
      avatarUrl: '/images/messages/chelsea-list.png',
      role: 'Property Manager',
      isVerifiedLandlord: true,
      phoneNumber: '+233 24 555 0192',
    },
    messages: [
      {
        id: 'msg-c1',
        conversationId: 'conv-chelsea',
        senderId: 'chelsea-id',
        content: 'Good morning, Stephen 👋\nIs this room vacant for the next academic year?',
        isRead: true,
        createdAt: '9:24 AM',
      },
      {
        id: 'msg-c2',
        conversationId: 'conv-chelsea',
        senderId: 'stephen-akwaaba',
        content: "Good morning. I'd like to know if the studio apartment is available.",
        isRead: true,
        createdAt: '9:32 AM',
      },
      {
        id: 'msg-c3',
        conversationId: 'conv-chelsea',
        senderId: 'chelsea-id',
        content: 'Sure! Let me check and get back to you shortly.',
        isRead: true,
        createdAt: '9:35 AM',
      },
      {
        id: 'msg-c4',
        conversationId: 'conv-chelsea',
        senderId: 'chelsea-id',
        content: '',
        isRead: true,
        createdAt: '9:36 AM',
        propertyCard: {
          title: 'Glacier Studio',
          location: 'Achimota, Accra',
          status: 'Available',
          image: '/images/messages/bedroom-thumb.png',
          href: '/dashboard/tenant/bookings',
        },
      },
    ],
  },
  {
    id: 'conv-glacier',
    tenantId: 'stephen-akwaaba',
    landlordId: 'glacier-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 1,
    category: 'PROPERTY_TEAM',
    isVerified: false,
    online: false,
    avatarIcon: 'IMAGE',
    partner: {
      id: 'glacier-id',
      firstName: 'Glacier',
      lastName: 'Studio',
      avatarUrl: '/images/messages/glacier-thumb.png',
      role: 'Residence Desk',
      isVerifiedLandlord: true,
    },
    messages: [
      {
        id: 'msg-g1',
        conversationId: 'conv-glacier',
        senderId: 'glacier-id',
        content: 'Your rent receipt for September is ready.',
        isRead: false,
        createdAt: '8:17 AM',
      },
    ],
  },
  {
    id: 'conv-support',
    tenantId: 'stephen-akwaaba',
    landlordId: 'support-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    category: 'OTHERS',
    isVerified: true,
    online: true,
    avatarIcon: 'HEADPHONES',
    partner: {
      id: 'support-id',
      firstName: 'Akwaaba Homes',
      lastName: 'Support',
      avatarUrl: null,
      role: 'Support Desk',
      isVerifiedLandlord: true,
    },
    messages: [
      {
        id: 'msg-s1',
        conversationId: 'conv-support',
        senderId: 'support-id',
        content: 'Thank you for contacting us. How can we help?',
        isRead: true,
        createdAt: 'Thu',
      },
    ],
  },
  {
    id: 'conv-john',
    tenantId: 'stephen-akwaaba',
    landlordId: 'john-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 1,
    category: 'OTHERS',
    isVerified: false,
    online: false,
    avatarIcon: 'IMAGE',
    partner: {
      id: 'john-id',
      firstName: 'John',
      lastName: 'Boateng',
      avatarUrl: '/images/messages/john-avatar.png',
      role: 'Resident Host',
      isVerifiedLandlord: false,
    },
    messages: [
      {
        id: 'msg-j1',
        conversationId: 'conv-john',
        senderId: 'john-id',
        content: 'When can I schedule a physical inspection?',
        isRead: false,
        createdAt: 'Wed',
      },
    ],
  },
  {
    id: 'conv-management',
    tenantId: 'stephen-akwaaba',
    landlordId: 'mgmt-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    category: 'MANAGEMENT',
    isVerified: false,
    online: false,
    avatarIcon: 'USERS',
    partner: {
      id: 'mgmt-id',
      firstName: 'Management',
      lastName: 'Team',
      avatarUrl: null,
      role: 'Facility Management',
      isVerifiedLandlord: true,
    },
    messages: [
      {
        id: 'msg-m1',
        conversationId: 'conv-management',
        senderId: 'mgmt-id',
        content: 'The water supply will be interrupted this Friday...',
        isRead: true,
        createdAt: 'Tue',
      },
    ],
  },
];

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
          ? 'bg-emerald-800 text-white'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer',
          isMine
            ? 'bg-white text-emerald-800 hover:bg-emerald-50'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        )}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={clsx('h-full transition-all', isMine ? 'bg-white' : 'bg-emerald-600')}
            style={{
              width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] opacity-75 mt-1 font-mono">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}

function MessagesContent() {
  const { socket } = useSocket();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const paramConversationId = searchParams.get('conversationId');
  const paramPartnerId = searchParams.get('partnerId');

  const [activeConversationId, setActiveConversationId] = useState<string>('conv-chelsea');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [mobileChatView, setMobileChatView] = useState(false);

  // Local state for interactive threads
  const [localConversations, setLocalConversations] = useState<Conversation[]>(MOCKUP_CONVERSATIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Current Authenticated User
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
  });

  const currentUser = userResponse?.user;
  const currentUserId = currentUser?.id || 'stephen-akwaaba';
  const currentUserRole = currentUser?.role || 'TENANT';

  // Fetch Real Conversations from Backend
  const { data: liveConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        return data;
      } catch {
        return [];
      }
    },
  });

  // Merge live conversations with mockup data
  const mergedConversations = useMemo(() => {
    if (liveConversations && liveConversations.length > 0) {
      // Map live conversations to have safe fields
      const formattedLive = liveConversations.map((c) => ({
        ...c,
        category: (c.category || 'PROPERTY_TEAM') as 'PROPERTY_TEAM' | 'MANAGEMENT' | 'OTHERS',
        isVerified: c.partner?.isVerifiedLandlord || false,
        online: true,
        avatarIcon: 'IMAGE' as const,
      }));
      return formattedLive;
    }
    return localConversations;
  }, [liveConversations, localConversations]);

  // Handle URL params
  useEffect(() => {
    if (paramConversationId) {
      setActiveConversationId(paramConversationId);
      setMobileChatView(true);
    } else if (paramPartnerId && mergedConversations.length > 0) {
      const found = mergedConversations.find((c) => c.partner?.id === paramPartnerId);
      if (found) {
        setActiveConversationId(found.id);
        setMobileChatView(true);
      }
    }
  }, [paramConversationId, paramPartnerId, mergedConversations]);

  // Active Conversation
  const activeConversation = useMemo(() => {
    return mergedConversations.find((c) => c.id === activeConversationId) || mergedConversations[0];
  }, [mergedConversations, activeConversationId]);

  // Filter conversations based on Tab and Search Query
  const filteredConversations = useMemo(() => {
    let list = mergedConversations;

    // Filter by Tab
    if (activeTab === 'PROPERTY_TEAM') {
      list = list.filter((c) => c.category === 'PROPERTY_TEAM');
    } else if (activeTab === 'MANAGEMENT') {
      list = list.filter((c) => c.category === 'MANAGEMENT');
    } else if (activeTab === 'OTHERS') {
      list = list.filter((c) => c.category === 'OTHERS');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          `${c.partner?.firstName} ${c.partner?.lastName}`.toLowerCase().includes(q) ||
          c.partner?.role?.toLowerCase().includes(q) ||
          c.messages?.some((m) => m.content?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [mergedConversations, activeTab, searchQuery]);

  // Counts for Tabs
  const counts = useMemo(() => {
    return {
      ALL: mergedConversations.length,
      PROPERTY_TEAM: mergedConversations.filter((c) => c.category === 'PROPERTY_TEAM').length,
      MANAGEMENT: mergedConversations.filter((c) => c.category === 'MANAGEMENT').length,
      OTHERS: mergedConversations.filter((c) => c.category === 'OTHERS').length,
    };
  }, [mergedConversations]);

  // Socket listener for incoming live messages
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        setIsPartnerTyping(false);
        setLocalConversations((prev) =>
          prev.map((c) => {
            if (c.id === message.conversationId) {
              return {
                ...c,
                messages: [...(c.messages || []), message],
              };
            }
            return c;
          })
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
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, currentUserId, activeConversationId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isPartnerTyping]);

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setNewMessage('');

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: currentUserId,
      content: text,
      isRead: false,
      createdAt: format(new Date(), 'h:mm a'),
    };

    // Optimistically update local conversation
    setLocalConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            messages: [...(c.messages || []), newMsg],
          };
        }
        return c;
      })
    );

    // If real conversation exists in backend, dispatch API call
    if (!activeConversation.id.startsWith('conv-')) {
      try {
        await api.post(`/chat/${activeConversation.id}/messages`, {
          content: text,
          mediaType: 'TEXT',
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (err) {
        console.error('Failed to send to backend:', err);
      }
    }

    setIsSending(false);
  };

  // Upload Media
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.loading('Uploading attachment...', { id: 'media-upload' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mediaUrl = res.data.url;
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content: `Attached: ${file.name}`,
        mediaUrl,
        mediaType: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
        fileName: file.name,
        isRead: false,
        createdAt: format(new Date(), 'h:mm a'),
      };

      setLocalConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              messages: [...(c.messages || []), newMsg],
            };
          }
          return c;
        })
      );

      toast.success('Attachment sent', { id: 'media-upload' });
    } catch (err) {
      toast.error('Failed to upload file', { id: 'media-upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
      />

      {/* ── TWO-PANEL CARDS CONTAINER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-125px)] min-h-[640px] items-stretch">
        {/* ── LEFT PANEL: CONVERSATIONS LIST CARD ── */}
        <div
          className={clsx(
            'lg:col-span-5 xl:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col overflow-hidden',
            mobileChatView ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-zinc-950 dark:text-white leading-tight tracking-tight">
                    Messages
                  </h1>
                </div>
              </div>

              {/* New Message Button */}
              <button
                type="button"
                onClick={() => setShowNewMessageModal(true)}
                className="px-3.5 py-1.5 rounded-full border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>New Message</span>
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Stay connected with your property team and community.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer',
                  activeTab === 'ALL'
                    ? 'bg-[#0F5A3E] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                )}
              >
                All ({counts.ALL})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PROPERTY_TEAM')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer',
                  activeTab === 'PROPERTY_TEAM'
                    ? 'bg-[#0F5A3E] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                )}
              >
                <span>Property Team </span>
                <span className={activeTab === 'PROPERTY_TEAM' ? 'text-emerald-200' : 'text-[#16A34A]'}>
                  ({counts.PROPERTY_TEAM})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MANAGEMENT')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer',
                  activeTab === 'MANAGEMENT'
                    ? 'bg-[#0F5A3E] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                )}
              >
                <span>Management </span>
                <span className={activeTab === 'MANAGEMENT' ? 'text-emerald-200' : 'text-[#16A34A]'}>
                  ({counts.MANAGEMENT})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('OTHERS')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer',
                  activeTab === 'OTHERS'
                    ? 'bg-[#0F5A3E] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                )}
              >
                <span>Others </span>
                <span className={activeTab === 'OTHERS' ? 'text-emerald-200' : 'text-[#16A34A]'}>
                  ({counts.OTHERS})
                </span>
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100/80 dark:divide-zinc-800/60">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversation.id;
              const lastMsg = conv.messages?.[conv.messages.length - 1];
              const partnerName = `${conv.partner?.firstName || ''} ${conv.partner?.lastName || ''}`.trim();

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setMobileChatView(true);
                  }}
                  className={clsx(
                    'w-full text-left p-4 sm:px-5 flex items-start gap-3.5 transition cursor-pointer relative',
                    isSelected
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-l-[#16A34A]'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  )}
                >
                  {/* Avatar with status */}
                  <div className="relative shrink-0">
                    {conv.avatarIcon === 'HEADPHONES' ? (
                      <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#0F5A3E] dark:text-emerald-400">
                        <Headphones className="w-5 h-5" />
                      </div>
                    ) : conv.avatarIcon === 'USERS' ? (
                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 relative bg-zinc-100 dark:bg-zinc-800">
                        <Image
                          src={conv.partner?.avatarUrl || '/images/messages/chelsea-list.png'}
                          alt={partnerName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-sm text-zinc-950 dark:text-white truncate">
                          {partnerName}
                        </span>
                        {conv.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 fill-[#16A34A] text-white shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 shrink-0">
                        {lastMsg?.createdAt || '9:24 AM'}
                      </span>
                    </div>

                    {conv.partner?.role && (
                      <p className="text-[11px] font-medium text-zinc-400 truncate">
                        {conv.partner.role}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {lastMsg?.content || (lastMsg?.propertyCard ? `Shared ${lastMsg.propertyCard.title}` : 'No messages yet')}
                      </p>

                      {Boolean(conv.unreadCount && conv.unreadCount > 0) && (
                        <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: ACTIVE CHAT WINDOW CARD ── */}
        <div
          className={clsx(
            'lg:col-span-7 xl:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col overflow-hidden',
            !mobileChatView ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 z-10">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileChatView(false)}
                className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                aria-label="Back to messages"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                {activeConversation.avatarIcon === 'HEADPHONES' ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#0F5A3E]">
                    <Headphones className="w-5 h-5" />
                  </div>
                ) : activeConversation.avatarIcon === 'USERS' ? (
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600">
                    <Users className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 relative bg-zinc-100">
                    <Image
                      src={activeConversation.partner?.avatarUrl || '/images/messages/chelsea-header.png'}
                      alt={`${activeConversation.partner?.firstName} ${activeConversation.partner?.lastName}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {activeConversation.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                )}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-sm sm:text-base text-zinc-950 dark:text-white leading-tight truncate">
                    {`${activeConversation.partner?.firstName} ${activeConversation.partner?.lastName}`}
                  </h2>
                  {activeConversation.isVerified && (
                    <CheckCircle2 className="w-4 h-4 fill-[#16A34A] text-white shrink-0" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <span>{activeConversation.partner?.role || 'Property Manager'}</span>
                  <span>•</span>
                  <span className="text-[#16A34A] font-bold">
                    {activeConversation.online ? 'Online' : 'Offline'}
                  </span>
                </p>
              </div>
            </div>

            {/* Actions: Phone, Video, More */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  toast.success(`Calling ${activeConversation.partner?.firstName}...`)
                }
                title="Voice Call"
                className="w-9 h-9 rounded-xl bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  toast.success(`Starting video call with ${activeConversation.partner?.firstName}...`)
                }
                title="Video Call"
                className="w-9 h-9 rounded-xl bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => toast('Conversation details and preferences', { icon: 'ℹ️' })}
                title="More Options"
                className="w-9 h-9 rounded-xl bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Stream Body (Subtle House Pattern Wallpaper) */}
          <div
            className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFBF9] dark:bg-[#0E1210]"
            style={{
              backgroundImage: "url('/images/messages/chat-houses-pattern.svg')",
              backgroundRepeat: 'repeat',
            }}
          >
            {/* Centered Date Pill (Today) */}
            <div className="flex justify-center my-2">
              <span className="bg-[#EAF7EE] dark:bg-emerald-950/60 text-[#0F5A3E] dark:text-emerald-300 text-xs font-bold px-4 py-1 rounded-full shadow-2xs border border-emerald-100 dark:border-emerald-900/60">
                Today
              </span>
            </div>

            {/* Messages */}
            {activeConversation.messages?.map((msg) => {
              const isMine = msg.senderId === currentUserId;

              // If message has an embedded Property Card (e.g. Glacier Studio)
              if (msg.propertyCard) {
                return (
                  <div key={msg.id} className="flex items-start gap-2.5 my-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700">
                      <Image
                        src={activeConversation.partner?.avatarUrl || '/images/messages/chelsea-list.png'}
                        alt={activeConversation.partner?.firstName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 shadow-xs max-w-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      {/* Thumbnail */}
                      <div className="w-full sm:w-32 h-24 sm:h-20 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                        <Image
                          src={msg.propertyCard.image || '/images/messages/bedroom-thumb.png'}
                          alt={msg.propertyCard.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-black text-sm text-zinc-950 dark:text-white truncate">
                            {msg.propertyCard.title}
                          </h4>
                          <span className="bg-[#EAF7EE] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {msg.propertyCard.status}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{msg.propertyCard.location}</span>
                        </p>

                        <div className="pt-1">
                          <Link
                            href={msg.propertyCard.href || '/dashboard/tenant/bookings'}
                            className="px-3.5 py-1 rounded-full border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 text-xs font-bold inline-flex items-center gap-1 transition"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Audio Voice Note
              if (msg.mediaType === 'AUDIO' && msg.mediaUrl) {
                return (
                  <div
                    key={msg.id}
                    className={clsx('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}
                  >
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 relative border border-zinc-200">
                        <Image
                          src={activeConversation.partner?.avatarUrl || '/images/messages/chelsea-list.png'}
                          alt={activeConversation.partner?.firstName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <AudioVoiceNotePlayer src={msg.mediaUrl} duration={msg.duration} isMine={isMine} />
                    {isMine && (
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 relative border border-zinc-200">
                        <Image
                          src="/images/messages/stephen-avatar.png"
                          alt="Stephen"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Bubble
              return (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex items-start gap-2.5 max-w-lg',
                    isMine ? 'ml-auto flex-row-reverse' : ''
                  )}
                >
                  {/* Sender Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700">
                    <Image
                      src={
                        isMine
                          ? '/images/messages/stephen-avatar.png'
                          : activeConversation.partner?.avatarUrl || '/images/messages/chelsea-list.png'
                      }
                      alt={isMine ? 'Stephen' : activeConversation.partner?.firstName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={clsx(
                      'p-3.5 rounded-2xl shadow-2xs space-y-1 text-xs sm:text-sm',
                      isMine
                        ? 'bg-[#D9F2E3] dark:bg-emerald-950/80 text-zinc-950 dark:text-emerald-100 rounded-tr-xs'
                        : 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-xs'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    <div
                      className={clsx(
                        'flex items-center gap-1 text-[10px] pt-0.5',
                        isMine ? 'justify-end text-emerald-800/80 dark:text-emerald-300' : 'text-zinc-400'
                      )}
                    >
                      <span>{msg.createdAt}</span>
                      {isMine && <CheckCheck className="w-3.5 h-3.5 text-[#16A34A] stroke-[2.5]" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator Bubble */}
            {(isPartnerTyping || activeConversation.id === 'conv-chelsea') && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={activeConversation.partner?.avatarUrl || '/images/messages/chelsea-list.png'}
                    alt={activeConversation.partner?.firstName}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 rounded-full shadow-2xs">
                {/* Paperclip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Attach file or photo"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text input */}
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                />

                {/* Emoji Smile */}
                <button
                  type="button"
                  onClick={() => setNewMessage((prev) => prev + ' 😊')}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer',
                  newMessage.trim()
                    ? 'bg-[#0F5A3E] hover:bg-[#0B432E] text-white'
                    : 'bg-[#0F5A3E] text-white opacity-90'
                )}
                title="Send Message"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white translate-x-0.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── NEW MESSAGE MODAL ── */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-zinc-950 dark:text-white">Start New Conversation</h3>
              <button
                type="button"
                onClick={() => setShowNewMessageModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Select who you would like to reach out to:
            </p>

            <div className="space-y-2">
              {MOCKUP_CONVERSATIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setShowNewMessageModal(false);
                    setMobileChatView(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0 border border-zinc-200">
                    <Image
                      src={c.partner?.avatarUrl || '/images/messages/chelsea-list.png'}
                      alt={c.partner?.firstName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      {c.partner?.firstName} {c.partner?.lastName}
                    </p>
                    <p className="text-xs text-zinc-500">{c.partner?.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
