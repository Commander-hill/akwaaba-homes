'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Loader2,
  Send,
  MessageSquare,
  User as UserIcon,
  CheckCheck,
  RefreshCw,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Play,
  Pause,
  Download,
  X,
  Volume2
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface MessagingTabProps {
  initialPartnerId?: string | null;
}

export default function MessagingTab({ initialPartnerId }: MessagingTabProps) {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Attachment upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async (payload: {
      convId: string;
      content?: string;
      mediaUrl?: string;
      mediaType?: string;
      fileName?: string;
      duration?: number;
    }) => {
      const res = await api.post(`/chat/${payload.convId}/messages`, payload);
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

  // Voice recording handlers
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
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      alert('Microphone access is required to record voice notes.');
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

  // Generic Media Upload Helper
  const uploadAndSendMedia = async (file: File | Blob, fileName: string, mediaType: 'IMAGE' | 'AUDIO' | 'DOCUMENT', duration?: number) => {
    if (!activeConvId) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      const uploadRes = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const mediaUrl = uploadRes.data.url;

      sendMessageMutation.mutate({
        convId: activeConvId,
        mediaUrl,
        mediaType,
        fileName,
        duration
      });
    } catch (err) {
      console.error('Failed to upload media:', err);
      alert('Failed to send attachment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Image upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendMedia(file, file.name, 'IMAGE');
      e.target.value = '';
    }
  };

  // Document upload handler
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendMedia(file, file.name, 'DOCUMENT');
      e.target.value = '';
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConvId) return;
    sendMessageMutation.mutate({ convId: activeConvId, content: newMessageText.trim(), mediaType: 'TEXT' });
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
    <div className="glass-card rounded-3xl border border-[var(--border)] overflow-hidden h-[640px] flex flex-col md:flex-row shadow-lg">
      
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
      <input type="file" ref={documentInputRef} onChange={handleDocumentSelect} accept=".pdf,.doc,.docx,.png,.jpg" className="hidden" />

      {/* LEFT COLUMN: Conversations List */}
      <div className="w-full md:w-80 border-r border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--primary)]" /> Conversations
          </h3>
          <button 
            onClick={() => refetchConvs()} 
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh threads"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {conversations?.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
              No active message threads yet. Start a conversation from any hostel page!
            </div>
          ) : (
            conversations?.map((conv: any) => {
              const isSelected = conv.id === activeConvId;
              const lastMsg = conv.messages?.[0];
              // Show unread dot if latest message is from the partner and not yet read
              const hasUnread = lastMsg && lastMsg.senderId !== session?.id && !lastMsg.isRead;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-500/10 border-l-4 border-[var(--primary)]' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-200 dark:border-slate-700">
                    {conv.partner?.avatarUrl ? (
                      <img src={getImageUrl(conv.partner.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-indigo-500" />
                    )}
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-xs truncate ${hasUnread ? 'font-extrabold text-[var(--foreground)]' : 'font-bold text-[var(--foreground)]'}`}>
                        {conv.partner?.firstName} {conv.partner?.lastName}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${hasUnread ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                      {lastMsg?.mediaType === 'AUDIO' ? '🎤 Voice note' : lastMsg?.mediaType === 'IMAGE' ? '📷 Photo attachment' : lastMsg?.mediaType === 'DOCUMENT' ? '📄 Document' : lastMsg?.content || 'Started conversation'}
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
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <div className="flex items-center gap-3">
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
                    Verified Akwaaba Member
                  </span>
                </div>
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border border-indigo-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading attachment...
                </div>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messagesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-xs text-[var(--muted-foreground)] py-12">
                  Say hi to {activeConv.partner?.firstName}! Send text, photos, documents, or voice notes.
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
                        className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm space-y-2 ${
                          isMine
                            ? 'bg-gradient-to-r from-indigo-600 to-[#5B4CFF] text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* 1. IMAGE ATTACHMENT */}
                        {msg.mediaType === 'IMAGE' && msg.mediaUrl && (
                          <div className="rounded-xl overflow-hidden border border-white/20">
                            <img src={getImageUrl(msg.mediaUrl)} alt="Photo attachment" className="w-full max-h-60 object-cover rounded-lg" />
                          </div>
                        )}

                        {/* 2. AUDIO VOICE NOTE */}
                        {msg.mediaType === 'AUDIO' && msg.mediaUrl && (
                          <div className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/10 rounded-xl">
                            <audio controls src={getImageUrl(msg.mediaUrl)} className="h-8 max-w-[200px]" />
                            {msg.duration && <span className="text-[10px] opacity-80 font-mono">{msg.duration}s</span>}
                          </div>
                        )}

                        {/* 3. DOCUMENT ATTACHMENT */}
                        {msg.mediaType === 'DOCUMENT' && msg.mediaUrl && (
                          <a
                            href={getImageUrl(msg.mediaUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 p-2.5 bg-black/10 dark:bg-white/10 rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <FileText className="w-6 h-6 shrink-0 text-amber-400" />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-bold text-xs truncate">{msg.fileName || 'Attachment Document'}</p>
                              <span className="text-[10px] opacity-75">Click to view / download PDF</span>
                            </div>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        )}

                        {/* 4. TEXT CONTENT */}
                        {msg.content && msg.mediaType !== 'AUDIO' && (
                          <p>{msg.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[9px] text-[var(--muted-foreground)] px-1">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          <span title={msg.isRead ? 'Seen' : 'Delivered'}>
                            <CheckCheck className={`w-3 h-3 transition-colors ${msg.isRead ? 'text-blue-400' : 'text-slate-400'}`} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice Recording Overlay Bar */}
            {isRecording ? (
              <div className="p-3 border-t border-red-500/30 bg-red-500/10 flex items-center justify-between gap-3 animate-pulse shrink-0">
                <div className="flex items-center gap-2 text-xs font-black text-red-600 dark:text-red-400">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  Recording Voice Note ({recordingTime}s)...
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Voice Note
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Rich Input Bar */
              <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                {/* Image Picker Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* PDF Document Button */}
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Attach Document (PDF)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Voice Note Mic Button */}
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isUploading}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Write message to ${activeConv.partner?.firstName || 'contact'}...`}
                  className="flex-1 bg-white dark:bg-slate-950 border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sendMessageMutation.isPending || isUploading}
                  className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30 text-[var(--primary)]" />
            <p className="text-xs font-medium">Select a conversation thread on the left to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
