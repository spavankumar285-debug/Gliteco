'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Mic,
  Volume2,
  Square,
  Sparkles,
  Globe,
  Layers,
  PenTool,
  Download,
  Share2,
  Image as ImageIcon,
  FileText,
  Presentation,
  Play,
  X,
  Smartphone,
  Monitor,
  Wand2,
  MessageSquare,
  Plus,
  History,
  Trash2,
  AlertCircle,
  RotateCcw,
  Paperclip,
  Film,
  Mail,
  Lock,
  User,
  ArrowRight,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import PptxGenJS from 'pptxgenjs';

type SavedSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: any[];
  images: { id: string; prompt: string; url: string }[];
};

type PendingAttachment = {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'document';
  previewUrl?: string;
  imageDataUrls?: string[];
  extractedText?: string;
};

type GlitecoUser = {
  name: string;
  email: string;
  isGuest: boolean;
};

const markdownComponents: any = {
  h1: ({ children }: any) => <h1 className="text-lg font-bold text-white mt-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold text-indigo-300 mt-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold text-indigo-300 mt-1">{children}</h3>,
  p: ({ children }: any) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2 rounded-xl border border-zinc-700">
      <table className="w-full text-left border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-zinc-800 text-indigo-300">{children}</thead>,
  th: ({ children }: any) => <th className="px-3 py-2 font-semibold border-b border-zinc-700">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 border-b border-zinc-800/80 align-top">{children}</td>,
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 text-xs font-mono">{children}</code>
  ),
};

const markdownPlugins = [remarkGfm];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<GlitecoUser | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedUser = localStorage.getItem('gliteco_user_profile_v1');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {}
  }, []);

  if (!mounted) {
    return <div className="h-screen bg-zinc-950" />;
  }

  const handleAuthSuccess = (profile: GlitecoUser) => {
    setUser(profile);
    try {
      localStorage.setItem('gliteco_user_profile_v1', JSON.stringify(profile));
    } catch {}
  };

  const handleSignOut = () => {
    setUser(null);
    try {
      localStorage.removeItem('gliteco_user_profile_v1');
    } catch {}
  };

  if (!user) {
    return <GlitecoAuthScreen onComplete={handleAuthSuccess} />;
  }

  return <GlitecoStudio user={user} onSignOut={handleSignOut} />;
}

function GlitecoAuthScreen({ onComplete }: { onComplete: (u: GlitecoUser) => void }) {
  const brandName = process.env.NEXT_PUBLIC_APP_NAME || 'Gliteco';
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.trim().length < 4) {
      setFormError('Please enter a password (at least 4 characters).');
      return;
    }

    const displayName =
      name.trim() ||
      trimmedEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    onComplete({
      name: displayName,
      email: trimmedEmail,
      isGuest: false,
    });
  };

  const handleContinueGuest = () => {
    onComplete({
      name: 'Guest Explorer',
      email: '',
      isGuest: true,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />

      {/* Top Minimal Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">{brandName}</span>
        </div>
        <button
          onClick={handleContinueGuest}
          className="text-xs font-medium text-zinc-400 hover:text-white transition flex items-center gap-1"
        >
          Skip for now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6 relative z-10">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* App Logo & Tagline */}
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 ring-1 ring-white/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight pt-1">Welcome to {brandName}</h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              All-rounder AI for instant chat, live app building, image & logo design, PPTs, and vision analysis.
            </p>
          </div>

          {/* Email Sign-In / Sign-Up Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {isSignUp && (
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {formError && <p className="text-xs text-red-400 text-center">{formError}</p>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {isSignUp ? 'Create Gliteco Account' : 'Sign In with Email'}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one free"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500">or</span>
            <div className="flex-grow border-t border-zinc-800" />
          </div>

          {/* Instant Continue Button */}
          <button
            type="button"
            onClick={handleContinueGuest}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            Continue without Sign In <ArrowRight className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Feature Highlights */}
          <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-400">
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free AI</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>App & PPT Maker</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Language</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Credit */}
      <footer className="text-center text-[11px] text-zinc-500 py-2 relative z-10">
        {brandName} AI • Created by Pavan and Shalini for an advanced AI technology
      </footer>
    </div>
  );
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractVideoFrames(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      const timestamps = [0.15 * duration, 0.5 * duration, 0.85 * duration];
      const frames: string[] = [];

      for (const time of timestamps) {
        await new Promise<void>((res) => {
          video.currentTime = Math.min(time, Math.max(duration - 0.1, 0));
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(720 / (video.videoWidth || 720), 1);
            canvas.width = (video.videoWidth || 640) * scale;
            canvas.height = (video.videoHeight || 360) * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.75));
            res();
          };
        });
      }

      URL.revokeObjectURL(objectUrl);
      resolve(frames);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve([]);
    };
  });
}

async function extractDocumentText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 15);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n${strings}`;
    }
    return fullText.slice(0, 18000);
  }

  const text = await file.text();
  return text.slice(0, 18000);
}

function GlitecoStudio({ user, onSignOut }: { user: GlitecoUser; onSignOut: () => void }) {
  const brandName = process.env.NEXT_PUBLIC_APP_NAME || 'Gliteco';
  const STORAGE_KEY = 'gliteco_chat_sessions_v1';

  const [mode, setMode] = useState<'general' | 'dev' | 'image' | 'search' | 'creator'>('general');
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ id: string; prompt: string; url: string }[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeAppHtml, setActiveAppHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const lastAutoOpenedId = useRef<string | null>(null);
  const lastSavedSnapshot = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => String(Date.now()));
  const [showHistory, setShowHistory] = useState(false);

  const { messages, setMessages, sendMessage, status, error, regenerate } = useChat();
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generatedImages, status, error]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const latest = parsed[0];
          setCurrentSessionId(latest.id);
          setMessages(latest.messages || []);
          setGeneratedImages(latest.images || []);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    if (messages.length === 0 && generatedImages.length === 0) return;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const firstText = firstUserMsg ? firstUserMsg.parts.filter((p) => p.type === 'text').filter(Boolean).map((p) => p.text).join('') : generatedImages[0]?.prompt || 'New Conversation';
    const title = firstText.slice(0, 42) + (firstText.length > 42 ? '...' : '');
    const lightweightMessages = messages.map((m) => ({
      ...m,
      parts: m.parts.map(()=>({type:'text',text:'[Attached Media]'})),
    }));

    setSessions((prev) => {
      const updatedSession: SavedSession = {
        id: currentSessionId,
        title,
        updatedAt: Date.now(),
        messages: lightweightMessages,
        images: generatedImages,
      };
      const others = prev.filter((s) => s.id !== currentSessionId);
      const next = [updatedSession, ...others].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [status, messages, generatedImages, currentSessionId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsProcessingFile(true);

    try {
      for (const file of files.slice(0, 3)) {
        const id = `${Date.now()}-${Math.random()}`;
        if (file.type.startsWith('image/')) {
          const dataUrl = await compressImageFile(file);
          setAttachments((prev) => [
            ...prev,
            { id, name: file.name, kind: 'image', previewUrl: dataUrl, imageDataUrls: [dataUrl] },
          ]);
        } else if (file.type.startsWith('video/')) {
          const frames = await extractVideoFrames(file);
          if (frames.length > 0) {
            setAttachments((prev) => [
              ...prev,
              { id, name: file.name, kind: 'video', previewUrl: frames[0], imageDataUrls: frames },
            ]);
          } else {
            alert(`Could not read video frames from ${file.name}.`);
          }
        } else {
          const text = await extractDocumentText(file);
          setAttachments((prev) => [
            ...prev,
            { id, name: file.name, kind: 'document', extractedText: text },
          ]);
        }
      }
    } catch {
      alert('Could not read one of the selected files. Try a smaller image, video, PDF, or text file.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeakingMsgId(null);
  };

  const toggleSpeakText = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanForSpeech = text.replace(/[#*`_|>-]/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech);
    let detectedLang = 'en-US';
    if (/[\u0B80-\u0BFF]/.test(cleanForSpeech)) detectedLang = 'ta-IN';
    else if (/[\u0900-\u097F]/.test(cleanForSpeech)) detectedLang = 'hi-IN';
    else if (/[\u0C00-\u0C7F]/.test(cleanForSpeech)) detectedLang = 'te-IN';
    else if (/[\u0C80-\u0CFF]/.test(cleanForSpeech)) detectedLang = 'kn-IN';
    else if (/[\u0D00-\u0D7F]/.test(cleanForSpeech)) detectedLang = 'ml-IN';
    else if (/[\u0980-\u09FF]/.test(cleanForSpeech)) detectedLang = 'bn-IN';
    else if (/[\u0600-\u06FF]/.test(cleanForSpeech)) detectedLang = 'ar-SA';
    else if (/[\u4E00-\u9FFF]/.test(cleanForSpeech)) detectedLang = 'zh-CN';
    else if (/[\u3040-\u30FF]/.test(cleanForSpeech)) detectedLang = 'ja-JP';
    else if (/[\uAC00-\uD7AF]/.test(cleanForSpeech)) detectedLang = 'ko-KR';
    utterance.lang = detectedLang;
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(detectedLang.split('-')[0]));
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const startNewChat = () => {
    stopSpeaking();
    const newId = String(Date.now());
    lastSavedSnapshot.current = '';
    setCurrentSessionId(newId);
    setMessages([]);
    setGeneratedImages([]);
    setAttachments([]);
    setShowHistory(false);
  };

  const loadSession = (session: SavedSession) => {
    stopSpeaking();
    lastSavedSnapshot.current = JSON.stringify({
      id: session.id,
      msgCount: (session.messages || []).length,
      lastMsgId: session.messages?.[session.messages.length - 1]?.id,
      imgCount: (session.images || []).length,
      lastImgId: session.images?.[session.images.length - 1]?.id,
    });
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setGeneratedImages(session.images || []);
    setAttachments([]);
    setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
    if (id === currentSessionId) {
      if (filtered.length > 0) {
        loadSession(filtered[0]);
      } else {
        startNewChat();
      }
    }
  };

  const extractHtmlBlock = (text: string): string | null => {
    const match = text.match(/```html\s*([\s\S]*?)```/i);
    return match ? match[1].trim() : null;
  };

  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastAutoOpenedId.current !== lastMsg.id) {
        const textContent = lastMsg.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('');
        const html = extractHtmlBlock(textContent);
        if (html) {
          lastAutoOpenedId.current = lastMsg.id;
          setActiveAppHtml(html);
        }
      }
    }
  }, [status, messages]);

  const submitMessage = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || isProcessingFile) return;

    stopSpeaking();

    const isImageGenRequest =
      attachments.length === 0 &&
      (mode === 'image' ||
        /^(generate|create|draw|make|design)\s+(an?\s+)?(image|picture|photo|logo|poster|banner|illustration)\b/i.test(
          trimmed
        ));

    if (isImageGenRequest) {
      const cleanPrompt =
        trimmed.replace(
          /^(generate|create|draw|make|design)\s+(an?\s+)?(image|picture|photo|logo|poster|banner|illustration)\s*(of|for)?\s*/i,
          ''
        ) || trimmed;
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        cleanPrompt
      )}?width=1024&height=1024&seed=${seed}&nologo=true`;
      setGeneratedImages((prev) => [...prev, { id: String(Date.now()), prompt: trimmed, url }]);
      setInput('');
      return;
    }

    const docSections = attachments
      .filter((a) => a.kind === 'document' && a.extractedText)
      .map((a) => `\n\n[Uploaded File: ${a.name}]\n${a.extractedText}`)
      .join('');

    const videoNotes = attachments
      .filter((a) => a.kind === 'video')
      .map((a) => `\n[Uploaded Video: ${a.name} — analyzing key frames]`)
      .join('');

    const userPrompt =
      (trimmed || 'Please analyze the attached file(s) in detail.') + videoNotes + docSections;

    const fileParts: any[] = [];
    attachments.forEach((att) => {
      if (att.imageDataUrls) {
        att.imageDataUrls.forEach((dataUrl, idx) => {
          fileParts.push({
            type: 'file',
            mediaType: 'image/jpeg',
            filename: `${att.name}-frame-${idx + 1}.jpg`,
            url: dataUrl,
          });
        });
      }
    });

    const isAppBuildRequest =
      mode === 'dev' ||
      /^(build|design|create|make)\s+(me\s+)?(a\s+|an\s+)?(full\s+)?(app|website|web\s*app|webpage|landing\s*page|dashboard|store|game)\b/i.test(
        trimmed
      );

    sendMessage(
      {
        parts: [{ type: 'text', text: userPrompt }, ...fileParts],
      } as any,
      { body: { mode: isAppBuildRequest ? 'dev' : mode } }
    );

    setInput('');
    setAttachments([]);
  };

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const retryImage = (id: string, prompt: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: false }));
    const cleanPrompt =
      prompt.replace(
        /^(generate|create|draw|make|design)\s+(an?\s+)?(image|picture|photo|logo|poster|banner|illustration)\s*(of|for)?\s*/i,
        ''
      ) || prompt;
    const seed = Math.floor(Math.random() * 100000);
    const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      cleanPrompt
    )}?width=1024&height=1024&seed=${seed}&nologo=true`;
    setGeneratedImages((prev) => prev.map((img) => (img.id === id ? { ...img, url: newUrl } : img)));
  };

  const downloadStandaloneApp = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandName.toLowerCase()}-app.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (text: string) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${brandName} Document`, 14, 18);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 180);
    let y = 28;
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 6;
    });
    doc.save(`${brandName.toLowerCase()}-doc.pdf`);
  };

  const downloadPPT = async (text: string) => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '111827' };
    titleSlide.addText(brandName, { x: 0.8, y: 2.0, w: 11.5, h: 1, fontSize: 36, bold: true, color: '818CF8' });
    titleSlide.addText('Created with Gliteco AI Studio', {
      x: 0.8,
      y: 3.1,
      w: 11.5,
      h: 0.6,
      fontSize: 18,
      color: 'E5E7EB',
    });

    const chunks = text
      .split(/\n{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);

    const slidesData = chunks.length > 0 ? chunks.slice(0, 10) : [text];

    slidesData.forEach((chunk, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: '09090B' };
      const lines = chunk.split('\n');
      const heading = lines[0].replace(/^[#*\-\d.]+\s*/, '').slice(0, 70) || `Slide ${index + 1}`;
      const body = lines.slice(1).join('\n') || chunk;

      slide.addText(heading, { x: 0.7, y: 0.5, w: 11.8, h: 0.8, fontSize: 24, bold: true, color: 'A5B4FC' });
      slide.addText(body.slice(0, 900), {
        x: 0.7,
        y: 1.5,
        w: 11.8,
        h: 5.2,
        fontSize: 15,
        color: 'F4F4F5',
        valign: 'top',
      });
    });

    await pptx.writeFile({ fileName: `${brandName.toLowerCase()}-presentation.pptx` });
  };

  const startVoiceInput = () => {
    stopSpeaking();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice input works best in Chrome/Edge.');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    setIsListening(true);
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const shareApp = async () => {
    if (navigator.share) {
      await navigator.share({
        title: brandName,
        text: `Try ${brandName} — Free AI Chat, Vision & File Analysis, App Builder, Image Studio, PPT & PDF Maker!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('App link copied! Share it with friends.');
    }
  };

  const paperclipClass = isProcessingFile ? 'w-5 h-5 text-indigo-400 animate-spin' : 'w-5 h-5 text-indigo-400';

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Chat Memory & History Sidebar */}
      {showHistory && (
        <aside className="fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shadow-2xl">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" /> Saved Chat Memory
            </span>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2.5">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-4 h-4" /> New Chat / Project
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-6">Your chats will be saved here automatically.</p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => loadSession(s)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition ${
                  s.id === currentSessionId
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                <span className="truncate pr-2">{s.title}</span>
                <button
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* User Account Footer inside Sidebar */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.isGuest ? 'Guest Mode' : user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400"
              title={user.isGuest ? 'Sign In' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Clean Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title="Open Saved Chat Memory"
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Memory ({sessions.length})</span>
            </button>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title="Start a New Chat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <div className="flex items-center gap-1.5 pl-1">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-lg tracking-tight">{brandName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={shareApp}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
            >
              <Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              title={user.isGuest ? 'Sign in with Email' : `Signed in as ${user.email}`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[90px] truncate">{user.isGuest ? 'Sign In' : user.name}</span>
            </button>
          </div>
        </header>

        {/* All-Rounder Mode Switcher */}
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-zinc-800/60 bg-zinc-900/40 shrink-0">
          {[
            { id: 'general', label: 'AI Chat', icon: MessageSquare },
            { id: 'dev', label: 'App & Web Designer', icon: Layers },
            { id: 'image', label: 'Image & Logo Studio', icon: ImageIcon },
            { id: 'creator', label: 'PPT & PDF Maker', icon: PenTool },
            { id: 'search', label: 'Live Web Search', icon: Globe },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  mode === item.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </div>

        {/* Top Ad Monetization Slot */}
        {/* Main Visual & Chat Canvas */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
          {messages.length === 0 && generatedImages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {user.isGuest
                  ? `Ask, Upload & Create Anything with ${brandName}`
                  : `Welcome back, ${user.name}!`}
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Upload photos, videos, PDFs, or documents—or design live apps, websites, logos, PPT slides, and PDFs
                in seconds.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  'Explain quantum computing simply with real-world examples',
                  'Design a complete food delivery app with menu, cart & checkout',
                  'Create a 6-slide presentation on the future of artificial intelligence',
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => setInput(sample)}
                    className="text-xs px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500 text-zinc-300"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const textContent = m.parts
              .filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join('');
            const imageParts = m.parts.filter(
              (part: any) => part.type === 'file' && part.mediaType?.startsWith('image/')
            );
            const htmlCode = m.role === 'assistant' ? extractHtmlBlock(textContent) : null;
            const cleanText = textContent.replace(/```html[\s\S]*?(```|$)/gi, '').trim();
            const isDesigningApp = m.role === 'assistant' && isLoading && /```html/i.test(textContent) && !htmlCode;
            const isSpeakingThis = speakingMsgId === m.id;

            const displayUserText =
              m.role === 'user' ? textContent.split('\n\n[Uploaded File:')[0] : textContent;

            return (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white whitespace-pre-wrap'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                  }`}
                >
                  {imageParts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {imageParts.map((imgPart: any, i: number) => (
                        <img
                          key={i}
                          src={imgPart.url}
                          alt="Uploaded"
                          className="w-24 h-24 object-cover rounded-lg border border-white/20"
                        />
                      ))}
                    </div>
                  )}

                  {m.role === 'user' ? (
                    displayUserText
                  ) : (
                    <div className="space-y-2.5">
                      {cleanText ? (
                        <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                          {cleanText}
                        </ReactMarkdown>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-indigo-300 text-xs font-medium py-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                          <span className="ml-1">Gliteco is thinking...</span>
                        </span>
                      )}
                    </div>
                  )}

                  {isDesigningApp && (
                    <div className="mt-3 p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center gap-3 text-xs text-indigo-300">
                      <Wand2 className="w-4 h-4 text-indigo-400 animate-spin"/>
                      Designing layout, colors, buttons & interactive features... Opening your live app automatically!
                    </div>
                  )}

                  {htmlCode && (
                    <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-indigo-950/30 border border-emerald-500/40 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-emerald-400">Your App & Webpage is Live!</p>
                          <p className="text-xs text-zinc-400">
                            Fully interactive—click below to use it in Web or Mobile view.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveAppHtml(htmlCode)}
                          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                        >
                          <Play className="w-4 h-4"/> Open Finished App
                        </button>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-4">
                        <button
                          onClick={() => downloadStandaloneApp(htmlCode)}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Download className="w-3.5 h-3.5"/> Save App to Device</button><a href="https://www.hostinger.in" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium">Host This Website Online</a>
                      </div>
                    </div>
                  )}

                  {m.role === 'assistant' && textContent && !htmlCode && !isDesigningApp && (
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => toggleSpeakText(m.id, textContent)}
                        className={`flex items-center gap-1 text-[11px] font-medium transition ${
                          isSpeakingThis
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-zinc-400 hover:text-indigo-400'
                        }`}
                      >
                        {isSpeakingThis ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current"/> Stop Speaking
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5"/> Listen
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => downloadPDF(textContent)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400"
                      >
                        <FileText className="w-3.5 h-3.5"/> Download PDF
                      </button>
                      <button
                        onClick={() => downloadPPT(textContent)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400"
                      >
                        <Presentation className="w-3.5 h-3.5"/> Download PPT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {generatedImages.map((img) => (
            <div key={img.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-indigo-600 text-white break-words">
                  {img.prompt}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl p-3 bg-zinc-900 border border-zinc-800 space-y-2">
                  {failedImages[img.id] ? (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-2">
                      <p>Image server took too long to respond.</p>
                      <button
                        onClick={() => retryImage(img.id, img.prompt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5"/> Retry Image
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={img.url}
                        alt={img.prompt}
                        onError={() => setFailedImages((prev) => ({ ...prev, [img.id]: true }))}
                        className="rounded-xl w-full max-w-md object-cover bg-zinc-800"
                      />
                      <a
                        href={img.url}
                        download={`${brandName.toLowerCase()}-design.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <Download className="w-3.5 h-3.5"/> Save Image / Logo
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Clear Error & Retry Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between gap-3 text-xs text-red-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0"/>
                <span className="break-words">{error.message || 'Connection interrupted or busy right now.'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={startNewChat}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  New Chat
                </button>
                <button
                  onClick={() => regenerate()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5"/> Retry
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </main>

        {/* Full-Screen Finished App Viewer */}
        {activeAppHtml && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5"/> {brandName} Live App Preview
                </span>

                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${
                      previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5"/> Website View
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${
                      previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5"/> Mobile App View
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadStandaloneApp(activeAppHtml)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Download className="w-3.5 h-3.5"/> Save App
                  </button>
                  <button
                    onClick={() => setActiveAppHtml(null)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden p-2">
                <iframe
                  srcDoc={activeAppHtml}
                  sandbox="allow-scripts allow-forms allow-modals"
                  className={`bg-white transition-all duration-300 ${
                    previewDevice === 'mobile'
                      ? 'w-[390px] h-[812px] max-h-full rounded-[2rem] border-4 border-zinc-700 shadow-2xl'
                      : 'w-full h-full rounded-lg'
                  }`}
                  title="Finished App"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input Bar with Image, Video & File Upload */}
        <footer className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
          {attachments.length > 0 && (
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2 mb-2.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt={att.name} className="w-7 h-7 rounded object-cover" />
                  ) : att.kind === 'video' ? (
                    <Film className="w-4 h-4 text-purple-400"/>
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-400"/>
                  )}
                  <span className="max-w-[140px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onSend} className="max-w-3xl mx-auto flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.py,.html,.css"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              title="Upload Image, Video, PDF, or File"
              className="p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-indigo-500 shrink-0"
            >
              <Paperclip className={paperclipClass}/>
            </button>
            <button
              type="button"
              onClick={startVoiceInput}
              title="Voice Input"
              className={`p-3 rounded-xl border border-zinc-800 shrink-0 ${
                isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              <Mic className="w-5 h-5"/>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Gliteco anything..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none max-h-40 overflow-y-auto leading-relaxed"
            />
            <button
              type="submit"
              disabled={isLoading || isProcessingFile || (!input.trim() && attachments.length === 0)}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shrink-0"
            >
              <Send className="w-5 h-5"/>
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-500 mt-2">
            By using {brandName}, you agree to our Terms of Use. Supports Images, Videos, PDFs & Documents 100% Free.
          </p>
        </footer>
      </div>
    </div>
  );
}