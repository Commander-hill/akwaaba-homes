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
  Play,
  Pause,
  X,
  Building2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
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

// ── DEMO SHOWCASE CONVERSATIONS (Activated only with ?demo=true query param) ──
const MOCKUP_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-chelsea',
    tenantId: 'demo-tenant',
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
        content: 'Good morning! 👋\nIs this room vacant for the next academic year?',
        isRead: true,
        createdAt: '2025-05-01T09:24:00.000Z',
      },
      {
        id: 'msg-c2',
        conversationId: 'conv-chelsea',
        senderId: 'demo-tenant',
        content: "Good morning. I'd like to know if the studio apartment is available.",
        isRead: true,
        createdAt: '2025-05-01T09:32:00.000Z',
      },
      {
        id: 'msg-c3',
        conversationId: 'conv-chelsea',
        senderId: 'chelsea-id',
        content: 'Sure! Let me check and get back to you shortly.',
        isRead: true,
        createdAt: '2025-05-01T09:35:00.000Z',
      },
      {
        id: 'msg-c4',
        conversationId: 'conv-chelsea',
        senderId: 'chelsea-id',
        content: '',
        isRead: true,
        createdAt: '2025-05-01T09:36:00.000Z',
        propertyCard: {
          title: 'Glacier Studio',
          location: 'Achimota, Accra',
          status: 'Available',
          image: '/images/messages/bedroom-thumb.png',
          href: '/properties/glacier-studio',
        },
      },
    ],
  },
  {
    id: 'conv-support',
    tenantId: 'demo-tenant',
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
      lastName: 'Resident Care',
      avatarUrl: null,
      role: 'Support Desk',
      isVerifiedLandlord: true,
    },
    messages: [
      {
        id: 'msg-s1',
        conversationId: 'conv-support',
        senderId: 'support-id',
        content: 'Welcome to Akwaaba Homes! How can our resident care team assist you today?',
        isRead: true,
        createdAt: '2025-05-01T08:00:00.000Z',
      },
    ],
  },
];

// Helper to format message calendar group
function getMessageDateGroup(createdAt: string): string {
  try {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return 'Today';
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, d MMMM yyyy');
  } catch {
    return 'Today';
  }
}

// Helper to format message time
function formatMessageTime(createdAt: string): string {
  try {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return createdAt;
    return format(date, 'h:mm a');
  } catch {
    return createdAt;
  }
}

// Helper to get initials
function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return `${f}${l}`.toUpperCase() || 'U';
}

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
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resolvedSrc = useMemo(() => {
    if (!src) return '';
    return getImageUrl(src);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setHasError(true);
        setIsPlaying(false);
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
      setHasError(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const totalDuration = duration || loadedDuration || 0;

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (hasError || !resolvedSrc) {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 p-2.5 rounded-xl text-xs',
          isMine
            ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-800'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
        )}
      >
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Audio recording unavailable</span>
      </div>
    );
  }

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
        src={resolvedSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
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
  const isDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [mobileChatView, setMobileChatView] = useState(false);

  // Local optimistic message cache mapped by conversation ID
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, Message[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Current Authenticated User
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
  });

  const currentUser = userResponse?.user;
  const currentUserId = currentUser?.id || '';
  const currentUserName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'You'
    : 'You';
  const currentUserInitials = getInitials(currentUser?.firstName, currentUser?.lastName);

  // 2. Fetch Real Conversations from Backend
  const { data: liveConversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        if (Array.isArray(data)) return data;
        if (Array.isArray((data as any)?.conversations)) return (data as any).conversations;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Tenant's Real Bookings for Contact Picker in New Message Modal
  const { data: tenantBookings = [], isLoading: isLoadingBookings } = useQuery<any>({
    queryKey: ['myBookings', 'contacts', currentUser?.role],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      try {
        const { data } = await api.get(currentUser?.role === 'LANDLORD' ? '/bookings/landlord' : '/bookings/me');
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.bookings)) return data.bookings;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Merge live conversations or handle demo mode
  const mergedConversations: Conversation[] = useMemo(() => {
    const list = Array.isArray(liveConversations)
      ? liveConversations
      : Array.isArray((liveConversations as any)?.conversations)
      ? (liveConversations as any).conversations
      : [];

    if (list.length > 0) {
      return (list as Conversation[]).map((c: Conversation) => ({
        ...c,
        category: (c.category || 'PROPERTY_TEAM') as 'PROPERTY_TEAM' | 'MANAGEMENT' | 'OTHERS',
        isVerified: c.partner?.isVerifiedLandlord || false,
        online: true,
        avatarIcon: 'IMAGE' as const,
      }));
    }
    // Only showcase mockups if query explicitly requested demo mode
    if (isDemo) {
      return MOCKUP_CONVERSATIONS;
    }
    return [];
  }, [liveConversations, isDemo]);

  // Keep active conversation aligned with URL parameters or conversation list
  useEffect(() => {
    if (paramConversationId) {
      setActiveConversationId(paramConversationId);
      setMobileChatView(true);
      return;
    }

    if (paramPartnerId && mergedConversations.length > 0) {
      const found = mergedConversations.find(
        (c) => c.partner?.id === paramPartnerId || c.landlordId === paramPartnerId
      );
      if (found) {
        setActiveConversationId(found.id);
        setMobileChatView(true);
        return;
      }
    }

    // Default to the first conversation if active conversation ID is unset or no longer exists
    if (!activeConversationId && mergedConversations.length > 0) {
      setActiveConversationId(mergedConversations[0].id);
    }
  }, [paramConversationId, paramPartnerId, mergedConversations, activeConversationId]);

  // Active Conversation Object
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return mergedConversations[0] || null;
    return mergedConversations.find((c) => c.id === activeConversationId) || mergedConversations[0] || null;
  }, [mergedConversations, activeConversationId]);

  // 4. Fetch Full Chat History for the Active Conversation (Resolves Anomaly 1)
  const { data: serverMessages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['conversationMessages', activeConversation?.id],
    queryFn: async () => {
      if (!activeConversation?.id) return [];
      if (activeConversation.id.startsWith('conv-')) {
        const mock = MOCKUP_CONVERSATIONS.find((m) => m.id === activeConversation.id);
        return mock?.messages || [];
      }
      try {
        const { data } = await api.get(`/chat/${activeConversation.id}/messages`);
        if (Array.isArray(data)) return data;
        if (Array.isArray((data as any)?.messages)) return (data as any).messages;
        return [];
      } catch (err) {
        console.error('Failed to fetch conversation history:', err);
        return [];
      }
    },
    enabled: !!activeConversation?.id,
  });

  // Combine server messages with local optimistic messages
  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    const serverList = Array.isArray(serverMessages) ? serverMessages : [];
    const local = optimisticMessages[activeConversation.id] || [];
    const existingIds = new Set(serverList.map((m) => m.id));
    const uniqueLocal = local.filter((m) => !existingIds.has(m.id));
    const combined = [...serverList, ...uniqueLocal];
    return combined.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return isNaN(timeA) || isNaN(timeB) ? 0 : timeA - timeB;
    });
  }, [serverMessages, optimisticMessages, activeConversation]);

  // Extract unique contacts from bookings for "New Message" modal (Resolves Anomaly 3)
  const bookingContacts = useMemo(() => {
    const list = Array.isArray(tenantBookings)
      ? tenantBookings
      : Array.isArray((tenantBookings as any)?.bookings)
      ? (tenantBookings as any).bookings
      : [];

    if (list.length === 0) return [];
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        role: string;
        avatarUrl?: string | null;
        propertyName: string;
        phoneNumber?: string | null;
        isVerified: boolean;
      }
    >();

    for (const b of list) {
      const landlord = currentUser?.role === 'LANDLORD' ? b?.tenant : b?.property?.landlord;
      if (landlord && landlord.id && !map.has(landlord.id)) {
        map.set(landlord.id, {
          id: landlord.id,
          name: `${landlord.firstName || ''} ${landlord.lastName || ''}`.trim() || 'Property Host',
          role: `${currentUser?.role === 'LANDLORD' ? 'Tenant' : 'Landlord'} • ${b?.property?.title || 'Accommodation'}`,
          avatarUrl: landlord.avatarUrl || null,
          propertyName: b?.property?.title || 'Property',
          phoneNumber: landlord.phoneNumber || null,
          isVerified: Boolean(landlord.isVerifiedLandlord),
        });
      }
    }
    return Array.from(map.values());
  }, [tenantBookings]);

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

  // Join/Leave socket room for the active conversation
  useEffect(() => {
    if (!socket || !activeConversation?.id || activeConversation.id.startsWith('conv-')) return;

    socket.emit('join_conversation', activeConversation.id);

    return () => {
      socket.emit('leave_conversation', activeConversation.id);
    };
  }, [socket, activeConversation?.id]);

  // Socket listener for incoming live messages & typing indicators
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleReceiveMessage = (message: Message) => {
      if (activeConversation && message.conversationId === activeConversation.id) {
        setIsPartnerTyping(false);
        queryClient.setQueryData<Message[]>(
          ['conversationMessages', activeConversation.id],
          (old = []) => {
            if (old.some((m) => m.id === message.id)) return old;
            return [...old, message];
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
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, currentUserId, activeConversation, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isPartnerTyping]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!socket || !activeConversation || activeConversation.id.startsWith('conv-')) return;

    socket.emit('typing', {
      conversationId: activeConversation.id,
      receiverId: activeConversation.partner?.id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversationId: activeConversation.id,
        receiverId: activeConversation.partner?.id,
      });
    }, 2000);
  };

  // Send Message (Resolves Anomaly 4 & 6)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text || isSending || !activeConversation) return;

    setIsSending(true);
    setNewMessage('');

    if (socket && !activeConversation.id.startsWith('conv-')) {
      socket.emit('stop_typing', {
        conversationId: activeConversation.id,
        receiverId: activeConversation.partner?.id,
      });
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: currentUserId,
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistically show message
    setOptimisticMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), optimisticMsg],
    }));

    if (!activeConversation.id.startsWith('conv-')) {
      try {
        await api.post(`/chat/${activeConversation.id}/messages`, {
          content: text,
          mediaType: 'TEXT',
        });
        queryClient.invalidateQueries({
          queryKey: ['conversationMessages', activeConversation.id],
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (err: any) {
        console.error('Failed to send message to backend:', err);
        toast.error(err.response?.data?.message || 'Failed to send message');
      }
    }

    setIsSending(false);
  };

  // Upload Media
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setIsUploading(true);
    toast.loading('Uploading attachment...', { id: 'media-upload' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mediaUrl = res.data.url;
      const isImg = file.type.startsWith('image/');
      const mediaType = isImg ? 'IMAGE' : 'DOCUMENT';

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        conversationId: activeConversation.id,
        senderId: currentUserId,
        content: `Attached: ${file.name}`,
        mediaUrl,
        mediaType,
        fileName: file.name,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setOptimisticMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), optimisticMsg],
      }));

      if (!activeConversation.id.startsWith('conv-')) {
        await api.post(`/chat/${activeConversation.id}/messages`, {
          content: `Attached: ${file.name}`,
          mediaUrl,
          mediaType,
          fileName: file.name,
        });
        queryClient.invalidateQueries({
          queryKey: ['conversationMessages', activeConversation.id],
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      toast.success('Attachment sent', { id: 'media-upload' });
    } catch (err) {
      toast.error('Failed to upload file', { id: 'media-upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start or open conversation with a specific contact (Resolves Anomaly 3)
  const handleSelectContact = async (contactId: string, contactName: string) => {
    // Check if a conversation already exists
    const existing = mergedConversations.find(
      (c) => c.partner?.id === contactId || c.landlordId === contactId
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setShowNewMessageModal(false);
      setMobileChatView(true);
      return;
    }

    // Otherwise create conversation via backend
    try {
      const { data: newConv } = await api.post('/chat/conversations', {
        partnerId: contactId,
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversationId(newConv.id);
      setShowNewMessageModal(false);
      setMobileChatView(true);
      toast.success(`Chat started with ${contactName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to start conversation');
    }
  };

  // Partner display name and initials
  const partnerName = activeConversation
    ? `${activeConversation.partner?.firstName || ''} ${activeConversation.partner?.lastName || ''}`.trim() ||
      'Property Host'
    : '';
  const partnerInitials = activeConversation
    ? getInitials(activeConversation.partner?.firstName, activeConversation.partner?.lastName)
    : 'PH';

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

            {/* Search Conversations Input */}
            <div className="relative pt-0.5">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search messages or contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer',
                  activeTab === 'ALL'
                    ? 'bg-[#16A34A] text-white shadow-xs'
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
                    ? 'bg-[#16A34A] text-white shadow-xs'
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
                    ? 'bg-[#16A34A] text-white shadow-xs'
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
                    ? 'bg-[#16A34A] text-white shadow-xs'
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

          {/* Conversations List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100/80 dark:divide-zinc-800/60">
            {isLoadingConversations ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs font-medium">Loading conversations...</p>
              </div>
            ) : mergedConversations.length === 0 ? (
              // Empty State for Zero Conversations (Resolves Anomaly 2)
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 h-full">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    No active conversations
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[220px]">
                    Your messages with landlords and residence managers will appear here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="mt-2 px-4 py-2 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Start New Chat</span>
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 space-y-2">
                <p className="text-xs">No conversations match your search filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const convPartnerName = `${conv.partner?.firstName || ''} ${conv.partner?.lastName || ''}`.trim() || 'Property Host';
                const convPartnerInitials = getInitials(conv.partner?.firstName, conv.partner?.lastName);
                const lastMsgTime = lastMsg?.createdAt ? formatMessageTime(lastMsg.createdAt) : '';

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
                      ) : conv.partner?.avatarUrl ? (
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 relative bg-zinc-100 dark:bg-zinc-800">
                          <Image
                            src={getImageUrl(conv.partner.avatarUrl)}
                            alt={convPartnerName}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 256px"
/>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs font-black">
                          {convPartnerInitials}
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
                            {convPartnerName}
                          </span>
                          {conv.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 fill-[#16A34A] text-white shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-zinc-400 shrink-0">
                          {lastMsgTime}
                        </span>
                      </div>

                      {conv.partner?.role && (
                        <p className="text-[11px] font-medium text-zinc-400 truncate">
                          {conv.partner.role}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {lastMsg?.content ||
                            (lastMsg?.propertyCard
                              ? `Shared ${lastMsg.propertyCard.title}`
                              : lastMsg?.mediaUrl
                              ? 'Attachment'
                              : 'No messages yet')}
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
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: ACTIVE CHAT WINDOW CARD ── */}
        <div
          className={clsx(
            'lg:col-span-7 xl:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs flex flex-col overflow-hidden',
            !mobileChatView ? 'hidden lg:flex' : 'flex'
          )}
        >
          {!activeConversation ? (
            // Empty State when no conversation is selected (Resolves Anomaly 2)
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#0E1210]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center mb-4 shadow-2xs border border-emerald-100 dark:border-emerald-900/40">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                Your Resident Message Desk
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
                Connect directly with your verified property landlord, manage booking inquiries, and maintain official correspondence records.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  <span>New Message</span>
                </button>
                <Link
                  href="/properties"
                  className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 text-xs font-bold transition cursor-pointer flex items-center gap-2"
                >
                  <span>Browse Properties</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
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
                    ) : activeConversation.partner?.avatarUrl ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 relative bg-zinc-100">
                        <Image
                          src={getImageUrl(activeConversation.partner.avatarUrl)}
                          alt={partnerName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 256px"
/>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs font-black">
                        {partnerInitials}
                      </div>
                    )}

                    {activeConversation.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-black text-sm sm:text-base text-zinc-950 dark:text-white leading-tight truncate">
                        {partnerName}
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

                {/* Actions: Phone (Resolves Anomaly 7), Video, More */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {activeConversation.partner?.phoneNumber ? (
                    <a
                      href={`tel:${activeConversation.partner.phoneNumber}`}
                      title={`Call ${partnerName} (${activeConversation.partner.phoneNumber})`}
                      className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-[#0F5A3E] dark:text-emerald-300 flex items-center justify-center transition cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        toast(
                          'Direct phone calls unlock automatically once a booking is confirmed with this property manager.',
                          { icon: '📞' }
                        )
                      }
                      title="Direct phone calling is available upon booking confirmation"
                      className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 flex items-center justify-center transition cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      toast(
                        'Live video inspection walkthroughs are scheduled directly via your property desk. Send a message to coordinate a date and time.',
                        { icon: '📹' }
                      )
                    }
                    title="Schedule Video Inspection Tour"
                    className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toast(
                        `Conversation thread with ${partnerName}. All correspondence is protected by Akwaaba Homes Resident Guarantee.`,
                        { icon: '🛡️' }
                      )
                    }
                    title="Conversation Security Details"
                    className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Stream Body */}
              <div
                className="flex-1 overflow-y-auto p-5 space-y-4 bg-white dark:bg-[#0E1210]"
                style={{
                  backgroundImage: "url('/images/messages/chat-houses-pattern.svg')",
                  backgroundRepeat: 'repeat',
                }}
              >
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-xs text-zinc-400">
                      This is the beginning of your conversation with {partnerName}.
                    </p>
                  </div>
                ) : (
                  (() => {
                    let lastDateGroup = '';
                    return activeMessages.map((msg) => {
                      const isMine = Boolean(currentUserId && msg.senderId === currentUserId);
                      const dateGroup = getMessageDateGroup(msg.createdAt);
                      const showDatePill = dateGroup !== lastDateGroup;
                      lastDateGroup = dateGroup;
                      const msgTime = formatMessageTime(msg.createdAt);

                      return (
                        <React.Fragment key={msg.id}>
                          {/* Centered Dynamic Date Pill (Resolves Anomaly 8) */}
                          {showDatePill && (
                            <div className="flex justify-center my-3">
                              <span className="bg-[#EAF7EE] dark:bg-emerald-950/60 text-[#0F5A3E] dark:text-emerald-300 text-xs font-bold px-4 py-1 rounded-full shadow-2xs border border-emerald-100 dark:border-emerald-900/60">
                                {dateGroup}
                              </span>
                            </div>
                          )}

                          {/* Property Card Message */}
                          {msg.propertyCard ? (
                            <div className="flex items-start gap-2.5 my-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                                {activeConversation.partner?.avatarUrl ? (
                                  <Image
                                    src={getImageUrl(activeConversation.partner.avatarUrl)}
                                    alt={partnerName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
/>
                                ) : (
                                  <div className="w-full h-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                                    {partnerInitials}
                                  </div>
                                )}
                              </div>

                              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 shadow-xs max-w-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                <div className="w-full sm:w-32 h-24 sm:h-20 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-100">
                                  <Image
                                    src={getImageUrl(msg.propertyCard.image || '/images/messages/bedroom-thumb.png')}
                                    alt={msg.propertyCard.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
/>
                                </div>

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
                                      href={msg.propertyCard.href || '/properties'}
                                      className="px-3.5 py-1 rounded-full border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 text-xs font-bold inline-flex items-center gap-1 transition"
                                    >
                                      <span>View Details</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : msg.mediaType === 'AUDIO' && msg.mediaUrl ? (
                            // Audio Voice Note (Resolves Anomaly 5 & 9)
                            <div
                              className={clsx(
                                'flex items-end gap-2',
                                isMine ? 'justify-end' : 'justify-start'
                              )}
                            >
                              {!isMine && (
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                                  {activeConversation.partner?.avatarUrl ? (
                                    <Image
                                      src={getImageUrl(activeConversation.partner.avatarUrl)}
                                      alt={partnerName}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 100vw, 256px"
/>
                                  ) : (
                                    <div className="w-full h-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                                      {partnerInitials}
                                    </div>
                                  )}
                                </div>
                              )}
                              <AudioVoiceNotePlayer
                                src={msg.mediaUrl}
                                duration={msg.duration}
                                isMine={isMine}
                              />
                              {isMine && (
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                                  <Image
                                    src={currentUser?.avatarUrl ? getImageUrl(currentUser.avatarUrl) : currentUser?.role === 'LANDLORD' ? '/images/avatars/landlord-avatar.png' : '/images/avatars/resident-stephen-darko.png'}
                                    alt={currentUserName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
/>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Standard Message Bubble (Resolves Anomaly 5 & 6)
                            <div
                              className={clsx(
                                'flex items-start gap-2.5 max-w-lg',
                                isMine ? 'ml-auto flex-row-reverse' : ''
                              )}
                            >
                              {/* Sender Avatar */}
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                                {isMine ? (
                                  <Image
                                    src={currentUser?.avatarUrl ? getImageUrl(currentUser.avatarUrl) : currentUser?.role === 'LANDLORD' ? '/images/avatars/landlord-avatar.png' : '/images/avatars/resident-stephen-darko.png'}
                                    alt={currentUserName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
/>
                                ) : activeConversation.partner?.avatarUrl ? (
                                  <Image
                                    src={getImageUrl(activeConversation.partner.avatarUrl)}
                                    alt={partnerName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 256px"
/>
                                ) : (
                                  <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center">
                                    {partnerInitials}
                                  </div>
                                )}
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
                                {/* Photo preview if attached */}
                                {msg.mediaType === 'IMAGE' && msg.mediaUrl && (
                                  <div className="rounded-xl overflow-hidden max-w-xs mb-2 border border-black/5 dark:border-white/10 relative h-48 w-full bg-zinc-100">
                                    <Image
                                      src={getImageUrl(msg.mediaUrl)}
                                      alt="Attached image"
                                      fill
                                      className="object-cover cursor-pointer hover:scale-105 transition"
                                      onClick={() => window.open(getImageUrl(msg.mediaUrl), '_blank')}
                                      sizes="(max-width: 768px) 100vw, 256px"
/>
                                  </div>
                                )}

                                {/* Document download link if attached */}
                                {msg.mediaType === 'DOCUMENT' && msg.mediaUrl && (
                                  <a
                                    href={getImageUrl(msg.mediaUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition mb-1 text-xs font-semibold"
                                  >
                                    <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                    <span className="truncate flex-1">
                                      {msg.fileName || 'Document Attachment'}
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                  </a>
                                )}

                                {msg.content && (
                                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                )}

                                <div
                                  className={clsx(
                                    'flex items-center gap-1 text-[10px] pt-0.5',
                                    isMine
                                      ? 'justify-end text-emerald-800/80 dark:text-emerald-300'
                                      : 'text-zinc-400'
                                  )}
                                >
                                  <span>{msgTime}</span>
                                  {isMine && (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#16A34A] stroke-[2.5]" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()
                )}

                {/* Typing Indicator Bubble */}
                {isPartnerTyping && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 relative border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                      {activeConversation.partner?.avatarUrl ? (
                        <Image
                          src={getImageUrl(activeConversation.partner.avatarUrl)}
                          alt={partnerName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 256px"
/>
                      ) : (
                        <div className="w-full h-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                          {partnerInitials}
                        </div>
                      )}
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
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </button>

                    {/* Text input */}
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={handleInputChange}
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
                        ? 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                        : 'bg-[#16A34A] text-white opacity-80 cursor-not-allowed'
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
            </>
          )}
        </div>
      </div>

      {/* ── NEW MESSAGE MODAL (Resolves Anomaly 3) ── */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-[28px] rounded-b-none sm:rounded-2xl sm:max-w-md w-full p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-black text-lg text-zinc-950 dark:text-white">
                  Start New Conversation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMessageModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select a property manager from your bookings or reach out to Akwaaba Resident Care:
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {/* Akwaaba Resident Support Desk Contact */}
              <button
                type="button"
                onClick={() => {
                  toast.success('Connecting with Akwaaba Resident Support...');
                  setShowNewMessageModal(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#0F5A3E] dark:text-emerald-400 shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      Akwaaba Resident Care
                    </p>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-xs text-zinc-500">24/7 Platform Inquiries & Dispute Resolution</p>
                </div>
              </button>

              {/* Dynamic Real Landlords From Tenant's Bookings */}
              {isLoadingBookings ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                </div>
              ) : bookingContacts.length > 0 ? (
                bookingContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact.id, contact.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition cursor-pointer text-left"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                      {contact.avatarUrl ? (
                        <Image
                          src={getImageUrl(contact.avatarUrl)}
                          alt={contact.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 256px"
/>
                      ) : (
                        <div className="w-full h-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {getInitials(contact.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {contact.name}
                        </p>
                        {contact.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 fill-[#16A34A] text-white shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{contact.role}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center space-y-1.5">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                    No active tenancy bookings yet.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    When you book or inquire on a listing, your property landlord will appear here.
                  </p>
                  <Link
                    href="/properties"
                    onClick={() => setShowNewMessageModal(false)}
                    className="inline-block mt-1 text-xs text-[#0F5A3E] dark:text-emerald-400 font-bold hover:underline"
                  >
                    Explore verified properties &rarr;
                  </Link>
                </div>
              )}
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
