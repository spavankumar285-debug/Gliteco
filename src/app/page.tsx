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
  Pause,
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
  Video,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
  BorderStyle,
} from 'docx';

type GeneratedVideoItem = {
  id: string;
  prompt: string;
  videoUrl: string;
};

type SavedSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: any[];
  images: { id: string; prompt: string; url: string }[];
  videos?: GeneratedVideoItem[];
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
  h1: ({ children }: any) => <h1 className="text-lg font-bold text-white mt-3 mb-1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold text-indigo-300 mt-3 mb-1">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold text-indigo-300 mt-2 mb-0.5">{children}</h3>,
  p: ({ children }: any) => <p className="leading-relaxed text-zinc-200">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1.5 text-zinc-200">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-1.5 text-zinc-200">{children}</ol>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-indigo-500 pl-3 italic text-zinc-300 my-2">{children}</blockquote>
  ),
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
  img: ({ src, alt }: any) => (
    <img src={src} alt={alt || 'Generated Visual'} className="rounded-xl w-full max-w-md my-2 border border-zinc-700 shadow-lg" />
  ),
};

const markdownPlugins = [remarkGfm];

function buildImageUrl(rawPrompt: string, width = 1024, height = 1024, seedOffset = 0): string {
  const cleaned =
    rawPrompt
      .replace(
        /\b(can you|please|could you|generate|create|draw|make|design|render|show me|give me)\b/gi,
        ''
      )
      .replace(
        /\b(an?|the)\s+(hd|4k|realistic|real|high quality)?\s*(image|picture|photo|photograph|logo|poster|banner|illustration|wallpaper|art)\s*(of|for|showing|with)?\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim() || rawPrompt;

  const enhanced = `${cleaned}, ultra detailed, photorealistic, cinematic lighting, 8k resolution, sharp focus`;
  const seed = Math.floor(Math.random() * 100000) + seedOffset;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

const DAILY_POINTS = 6;   // free points per person per day
const IMAGE_COST = 1;     // 1 image = 1 point
const VIDEO_COST = 3;     // 1 video = 3 points (it makes 3 images)

function todayKey() {
  return 'gliteco_usage_' + new Date().toISOString().slice(0, 10);
}
function readUsedPoints(): number {
  try {
    return Number(localStorage.getItem(todayKey()) || '0') || 0;
  } catch {
    return 0;
  }
}
function writeUsedPoints(n: number) {
  try {
    localStorage.setItem(todayKey(), String(n));
  } catch {}
}

function CinematicVideoCard({ video }: { video: GeneratedVideoItem }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-indigo-600 text-white break-words">
          {video.prompt}
        </div>
      </div>

      <div className="w-full max-w-xl rounded-2xl p-3 bg-zinc-900 border border-zinc-800 space-y-3 shadow-xl">
        <div className="flex justify-between items-center text-xs text-indigo-300">
          <span className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Gliteco AI Video
          </span>
          <span className="text-emerald-400">MP4 Ready</span>
        </div>

        <video
          src={video.videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full aspect-video rounded-xl bg-black object-contain"
        />

        <a
          href={video.videoUrl}
          download="gliteco-ai-video.mp4"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          <Download className="w-4 h-4" /> Download Video
        </a>
      </div>
    </div>
  );
}

export default function Home() { const [mounted, setMounted] = useState(false); const [user, setUser] = useState<GlitecoUser | null>(null);  useEffect(() => { setMounted(true); try { const savedUser = localStorage.getItem('gliteco_user_profile_v1'); if (savedUser) { setUser(JSON.parse(savedUser)); } } catch {} }, []);  if (!mounted) { return <div className="h-screen bg-zinc-950" />; }  const handleAuthSuccess = (profile: GlitecoUser) => { setUser(profile); try { localStorage.setItem('gliteco_user_profile_v1', JSON.stringify(profile)); } catch {} };  const handleSignOut = () => { setUser(null); try { localStorage.removeItem('gliteco_user_profile_v1'); } catch {} };  if (!user) { return <GlitecoAuthScreen onComplete={handleAuthSuccess} />; }  return <GlitecoStudio user={user} onSignOut={handleSignOut} />; }  function GlitecoAuthScreen({ onComplete }: { onComplete: (u: GlitecoUser) => void }) { const brandName = process.env.NEXT_PUBLIC_APP_NAME || 'Gliteco'; const [isSignUp, setIsSignUp] = useState(false); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [formError, setFormError] = useState('');  const handleEmailSubmit = (e: React.FormEvent) => { e.preventDefault(); setFormError('');  const trimmedEmail = email.trim(); if (!trimmedEmail || !trimmedEmail.includes('@')) { setFormError('Please enter a valid email address.'); return; } if (password.trim().length < 4) { setFormError('Please enter a password (at least 4 characters).'); return; }  const displayName = name.trim() || trimmedEmail .split('@')[0] .replace(/[._-]/g, ' ') .replace(/\b\w/g, (l) => l.toUpperCase());  onComplete({ name: displayName, email: trimmedEmail, isGuest: false, }); };  const handleContinueGuest = () => { onComplete({ name: 'Guest Explorer', email: '', isGuest: true, }); };  return ( <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden"> <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />  <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 relative z-10"> <div className="flex items-center gap-2.5"> <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30"> <Sparkles className="w-5 h-5 text-white" /> </div> <span className="font-bold text-xl tracking-tight">{brandName}</span> </div> <button onClick={handleContinueGuest} className="text-xs font-medium text-zinc-400 hover:text-white transition flex items-center gap-1" > Skip for now <ArrowRight className="w-3.5 h-3.5" /> </button> </header>  <main className="max-w-md w-full mx-auto my-auto py-6 relative z-10"> <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"> <div className="text-center space-y-2.5"> <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 ring-1 ring-white/20"> <Sparkles className="w-8 h-8 text-white" /> </div> <h1 className="text-2xl font-bold tracking-tight pt-1">Welcome to {brandName}</h1> <p className="text-xs sm:text-sm text-zinc-400"> All-rounder AI for instant chat, live app building, HD image & video creation, PPTs, and vision analysis. </p> </div>  <form onSubmit={handleEmailSubmit} className="space-y-3.5"> {isSignUp && ( <div className="relative"> <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" /> <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition" /> </div> )}  <div className="relative"> <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" /> <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition" /> </div>  <div className="relative"> <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" /> <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition" /> </div>  {formError && <p className="text-xs text-red-400 text-center">{formError}</p>}  <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2" > <Mail className="w-4 h-4" /> {isSignUp ? 'Create Gliteco Account' : 'Sign In with Email'} </button> </form>  <div className="text-center"> <button type="button" onClick={() => { setIsSignUp(!isSignUp); setFormError(''); }} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium" > {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one free"} </button> </div>  <div className="relative flex items-center py-0.5"> <div className="flex-grow border-t border-zinc-800" /> <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500">or</span> <div className="flex-grow border-t border-zinc-800" /> </div>  <button type="button" onClick={handleContinueGuest} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-sm transition flex items-center justify-center gap-2" > Continue without Sign In <ArrowRight className="w-4 h-4 text-indigo-400" /> </button>  <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-400"> <div className="flex flex-col items-center gap-1"> <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>100% Free AI</span> </div> <div className="flex flex-col items-center gap-1"> <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>Image & Video AI</span> </div> <div className="flex flex-col items-center gap-1"> <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>App & PPT Maker</span> </div> </div> </div> </main>  <footer className="text-center text-[11px] text-zinc-500 py-2 relative z-10"> {brandName}.ai • Created by Pavan and Shalini (CEO and CFO) of Gliteco </footer> </div> ); }  async function compressImageFile(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const maxDim = 1024; let { width, height } = img; if (width > maxDim || height > maxDim) { if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; } else { width = Math.round((width * maxDim) / height); height = maxDim; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.8)); }; img.onerror = reject; img.src = reader.result as string; }; reader.onerror = reject; reader.readAsDataURL(file); }); }  async function extractVideoFrames(file: File): Promise<string[]> { return new Promise((resolve) => { const video = document.createElement('video'); video.preload = 'metadata'; video.muted = true; video.playsInline = true; const objectUrl = URL.createObjectURL(file); video.src = objectUrl;  video.onloadedmetadata = async () => { const duration = video.duration || 1; const timestamps = [0.15 * duration, 0.5 * duration, 0.85 * duration]; const frames: string[] = [];  for (const time of timestamps) { await new Promise<void>((res) => { video.currentTime = Math.min(time, Math.max(duration - 0.1, 0)); video.onseeked = () => { const canvas = document.createElement('canvas'); const scale = Math.min(720 / (video.videoWidth || 720), 1); canvas.width = (video.videoWidth || 640) * scale; canvas.height = (video.videoHeight || 360) * scale; const ctx = canvas.getContext('2d'); ctx?.drawImage(video, 0, 0, canvas.width, canvas.height); frames.push(canvas.toDataURL('image/jpeg', 0.75)); res(); }; }); }  URL.revokeObjectURL(objectUrl); resolve(frames); };  video.onerror = () => { URL.revokeObjectURL(objectUrl); resolve([]); }; }); }  async function extractDocumentText(file: File): Promise<string> { if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) { const pdfjsLib = await import('pdfjs-dist'); pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
  const STORAGE_KEY = 'gliteco_chat_sessions_v2';

  const [mode, setMode] = useState<'general' | 'dev' | 'image' | 'video' | 'search' | 'creator'>('general');
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ id: string; prompt: string; url: string }[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoItem[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeAppHtml, setActiveAppHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [lastUploadedImage, setLastUploadedImage] = useState<string | undefined>(undefined);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [usedPoints, setUsedPoints] = useState(0);
  useEffect(() => { setUsedPoints(readUsedPoints()); }, []);
  const pointsLeft = Math.max(0, DAILY_POINTS - usedPoints);

  const lastAutoOpenedId = useRef<string | null>(null);
  const msgTimesRef = useRef<Record<string, number>>({});
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
  }, [messages, generatedImages, generatedVideos, isGeneratingMedia, status, error]);

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
          setGeneratedVideos((latest.videos || []).filter((v: GeneratedVideoItem) => !v.videoUrl.startsWith('blob:')));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    if (messages.length === 0 && generatedImages.length === 0 && generatedVideos.length === 0) return;

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const firstText = firstUserMsg
      ? firstUserMsg.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('')
      : generatedImages[0]?.prompt || generatedVideos[0]?.prompt || 'New Conversation';

    const title = firstText.slice(0, 42) + (firstText.length > 42 ? '...' : '');

    const lightweightMessages = messages.map((m) => ({
      ...m,
      parts: m.parts.filter((p: any) => p.type === 'text'),
    }));

    setSessions((prev) => {
      const updatedSession: SavedSession = {
        id: currentSessionId,
        title,
        updatedAt: Date.now(),
        messages: lightweightMessages,
        // Big base64 images froze the page when saved. Keep only small ones.
        images: generatedImages.filter((img) => img.url.length < 60000),
        videos: generatedVideos.filter((v) => !v.videoUrl.startsWith('blob:')),
      };
      const others = prev.filter((s) => s.id !== currentSessionId);
      const next = [updatedSession, ...others].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [status, messages, generatedImages, generatedVideos, currentSessionId]);

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
    setMediaError(null);
    stopSpeaking();
    const newId = String(Date.now());
    setCurrentSessionId(newId);
    setMessages([]);
    setGeneratedImages([]);
    setGeneratedVideos([]);
    setAttachments([]);
    setShowHistory(false);
  };

  const loadSession = (session: SavedSession) => {
    stopSpeaking();
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setGeneratedImages(session.images || []);
    setGeneratedVideos((session.videos || []).filter((v: GeneratedVideoItem) => !v.videoUrl.startsWith('blob:')));
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

  const friendlyError = (msg: string): string => {
    if (/4006|daily free allocation|429|busy/i.test(msg)) {
      return 'Our AI is very busy right now. Please try again a little later.';
    }
    if (/timed out|timeout|abort/i.test(msg)) {
      return 'This is taking too long. Please try again in a minute.';
    }
    if (/cloudflare|openrouter|ffmpeg|502|500/i.test(msg)) {
      return 'Something went wrong on our side. Please try again.';
    }
    return msg || 'Something went wrong. Please try again.';
  };

  const generateMedia = async (
    kind: 'image' | 'video',
    prompt: string,
    ref?: string,
    replaceId?: string
  ) => {
    const cost = kind === 'video' ? VIDEO_COST : IMAGE_COST;
    const used = readUsedPoints();
    if (used + cost > DAILY_POINTS) {
      setMediaError(
        `You have ${Math.max(0, DAILY_POINTS - used)} free tries left today, and this needs ${cost}. Please come back tomorrow.`
      );
      return;
    }

    setMediaKind(kind);
    setMediaError(null);
    setIsGeneratingMedia(true);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            prompt ||
            (kind === 'video'
              ? 'walking confidently through a modern sunlit city street'
              : 'studio portrait with cinematic lighting'),
          type: kind,
          referenceImage: ref,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Generation failed. Please try again.');
      }

      if (kind === 'video') {
        const blob = await res.blob();
        if (!blob.size || !blob.type.startsWith('video/')) {
          throw new Error('Server did not return a valid video file.');
        }
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedVideos((prev) => [
          ...prev,
          { id: String(Date.now()), prompt: prompt || 'Photo Motion Video', videoUrl },
        ]);
        const nv = readUsedPoints() + cost;
        writeUsedPoints(nv);
        setUsedPoints(nv);
      } else {
        const data = await res.json();
        if (!data?.url) throw new Error('No image was returned. Please try again.');
        const ni = readUsedPoints() + cost;
        writeUsedPoints(ni);
        setUsedPoints(ni);
        if (replaceId) {
          setGeneratedImages((prev) => prev.map((i) => (i.id === replaceId ? { ...i, url: data.url } : i)));
        } else {
          setGeneratedImages((prev) => [
            ...prev,
            { id: String(Date.now()), prompt: prompt || 'Reference Portrait', url: data.url },
          ]);
        }
      }
    } catch (err: any) {
      setMediaError(friendlyError(err?.message || ''));
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  const submitMessage = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || isProcessingFile || isGeneratingMedia) return;

    stopSpeaking();

    const extractImg = (list: any[]) =>
      (list || [])
        .flatMap((a: any) => [a?.previewUrl, ...(a?.imageDataUrls || []), a?.url])
        .find((v: any) => typeof v === 'string' && v.startsWith('data:image/')) as string | undefined;

    const compressDataUrl = (dataUrl?: string): Promise<string | undefined> =>
      new Promise((resolve) => {
        if (!dataUrl) return resolve(undefined);
        const img = new Image();
        img.onload = () => {
          const max = 512;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });

    const rawRefImg =
      extractImg(attachments) ||
      lastUploadedImage ||
      extractImg([...messages].reverse().flatMap((m: any) => m.parts || []));
    const refImg = await compressDataUrl(rawRefImg);
    const hasFreshAttachment = attachments.some((a) => a.kind === 'image');
    const isConversationalQuestion =
      !hasFreshAttachment &&
      mode === 'general' &&
      (/^\s*(why|what|how|when|where|who|is|are|can|could|would|will|do|does|did|i said|tell me about|explain)\b/i.test(trimmed) ||
        trimmed.endsWith('?'));

    const startsLikeQuestion =
      /^\s*(how|what|why|when|where|who|which|is|are|does|do|did|can|could|explain|tell me|show me how)\b/i.test(trimmed);
    const looksLikeSoftwareTopic =
      /\bvideo\s+(player|editor|editing|app|website|platform|tool|software|streaming|call|conferenc\w*)\b/i.test(trimmed);

    const isVideoGenRequest =
      mode === 'video' ||
      (mode === 'general' &&
        !startsLikeQuestion &&
        !looksLikeSoftwareTopic &&
        /\b(generate|create|make|render|produce|animate)\b[^.?!]*\b(video|videos|animation|animated|reel|clip|commercial)\b/i.test(trimmed));

    const isImageGenRequest =
      mode === 'image' ||
      (mode === 'general' &&
        !startsLikeQuestion &&
        !trimmed.includes('?') &&
        (/\b(generate|create|make|draw|design|render)\b[^.?!]*\b(image|picture|photo|poster|logo|banner|wallpaper|illustration|portrait)\b/i.test(trimmed) ||
          (Boolean(refImg) &&
            /\b(change|background|edit|replace|style|suit|dress|put|place|palace|beach|office)\b/i.test(trimmed))));

    if (isVideoGenRequest || isImageGenRequest) {
      const kind: 'image' | 'video' = isVideoGenRequest ? 'video' : 'image';
      setInput('');
      setAttachments([]);
      if (hasFreshAttachment && refImg) setLastUploadedImage(refImg);
      await generateMedia(kind, trimmed, refImg);
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
    generateMedia('image', prompt, lastUploadedImage, id);
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;

  let y = 20;

  const cleanText = (value: string) =>
    value
      .replace(/\r/g, '')
      .replace(/```[\w-]*\n?/g, '')
      .replace(/```/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
      .replace(/^\s*---\s*$/gm, '')
      .trim();

  const addPageIfNeeded = (height: number) => {
    if (y + height > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Created with ${brandName}  |  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: 'center' }
      );
    }
  };

  const addParagraph = (value: string) => {
    const cleaned = value
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*>\s?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    const wrappedLines = doc.splitTextToSize(cleaned, usableWidth);
    const lineHeight = 5.2;

    // Draw one line at a time so a long paragraph can continue onto
    // as many pages as necessary without crossing the bottom margin.
    for (const line of wrappedLines) {
      addPageIfNeeded(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 3;
  };

  const addHeading = (value: string, level: number) => {
    const heading = value.replace(/[*_`]/g, '').trim();
    if (!heading) return;

    const fontSize = level === 1 ? 19 : level === 2 ? 15 : 12;
    const lineHeight = level === 1 ? 8 : level === 2 ? 6.5 : 5.5;
    const spacing = level === 1 ? 5 : 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(31, 41, 55);

    const wrappedLines = doc.splitTextToSize(heading, usableWidth);
    for (const line of wrappedLines) {
      addPageIfNeeded(lineHeight + 1);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += spacing;
  };

  const addBullet = (value: string, numbered = false) => {
    const cleaned = value
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    if (!cleaned) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    const lines = doc.splitTextToSize(cleaned, usableWidth - 8);
    const lineHeight = 5.2;

    for (let index = 0; index < lines.length; index++) {
      addPageIfNeeded(lineHeight);
      if (index === 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(numbered ? '•' : '•', margin + 1, y);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(lines[index], margin + 7, y);
      y += lineHeight;
    }
    y += 2;
  };

  const addTable = (rows: string[][]) => {
    if (rows.length < 2) return;

    const normalizedRows = rows.map((row) =>
      row.map((cell) =>
        cell
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\s+/g, ' ')
          .trim()
      )
    );

    const headers = normalizedRows[0];
    const body = normalizedRows
      .slice(1)
      .filter((row) => !row.every((cell) => /^[-:\s]+$/.test(cell)))
      .map((row) => headers.map((_, index) => row[index] || ''));

    if (!body.length || !headers.length) return;

    // Keep every column inside the printable page width.
    const columnCount = headers.length;
    let widths: number[];

    if (columnCount === 2) {
      widths = [usableWidth * 0.3, usableWidth * 0.7];
    } else if (columnCount === 3) {
      widths = [usableWidth * 0.19, usableWidth * 0.405, usableWidth * 0.405];
    } else {
      widths = Array(columnCount).fill(usableWidth / columnCount);
    }

    const columnStyles: Record<number, { cellWidth: number; minCellWidth: number }> = {};
    widths.forEach((width, index) => {
      columnStyles[index] = {
        cellWidth: width,
        minCellWidth: Math.min(width, 12),
      };
    });

    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      tableWidth: usableWidth,
      margin: { left: margin, right: margin, top: 20, bottom: 20 },
      theme: 'grid',
      showHead: 'everyPage',
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'top',
        halign: 'left',
        textColor: [55, 65, 81],
        lineColor: [210, 215, 225],
        lineWidth: 0.15,
      },
      columnStyles,
      headStyles: {
        fillColor: [37, 65, 120],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        valign: 'middle',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    y = (doc as any).lastAutoTable.finalY + 9;
    addPageIfNeeded(1);
  };

  // Professional document header
  doc.setFillColor(24, 39, 75);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(`${brandName} Document`, margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 228, 240);
  doc.text('Prepared with AI assistance', margin, 26);

  y = 42;

  const lines = cleanText(text).split('\n');
  let paragraphBuffer: string[] = [];
  let tableBuffer: string[][] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      addParagraph(paragraphBuffer.join(' '));
      paragraphBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length) {
      addTable(tableBuffer);
      tableBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushTable();
      continue;
    }

    if (line.startsWith('|')) {
      flushParagraph();

      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

      tableBuffer.push(cells);
      continue;
    }

    flushTable();

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      addHeading(headingMatch[2], headingMatch[1].length);
      continue;
    }

    if (/^[-*+]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      addBullet(line);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushTable();

  addFooter();

  doc.save(`${brandName.toLowerCase()}-document.pdf`);
};



const downloadDOCX = async (text: string) => {
  try {
    const mime =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const saveBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    // Remove invalid AI-generated download links and Base64 data.
    const readableText = text
      .replace(
        /data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,[A-Za-z0-9+/=\s]+/gi,
        ''
      )
      .replace(/\[([^\]]+)\]\(data:[^)]+\)/gi, '$1')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')');

    const cleanInline = (value: string) =>
      value
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const lines = readableText
      .replace(/\r/g, '')
      .replace(/```[\w-]*\n?/g, '')
      .replace(/```/g, '')
      .split('\n');

    const children: any[] = [];
    let paragraphBuffer: string[] = [];
    let tableBuffer: string[][] = [];

    const flushParagraph = () => {
      const value = cleanInline(paragraphBuffer.join(' '));
      paragraphBuffer = [];

      if (!value) return;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: value,
              font: 'Times New Roman',
              size: 24,
              color: '252525',
            }),
          ],
          spacing: { after: 140, line: 360 },
        })
      );
    };

    const flushTable = () => {
      if (tableBuffer.length < 2) {
        tableBuffer = [];
        return;
      }

      const rows = tableBuffer
        .filter((row) => !row.every((cell) => /^[-:\s]+$/.test(cell)))
        .map((row) => row.map(cleanInline));

      tableBuffer = [];

      if (rows.length < 2) return;

      const columnCount = Math.max(...rows.map((row) => row.length));
      const colWidth = Math.floor(9000 / columnCount);

      const tableRows = rows.map((row, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          children: Array.from({ length: columnCount }, (_, colIndex) =>
            new TableCell({
              width: {
                size: colWidth,
                type: WidthType.DXA,
              },
              shading:
                rowIndex === 0
                  ? { fill: '243B64' }
                  : undefined,
              margins: {
                top: 100,
                bottom: 100,
                left: 120,
                right: 120,
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[colIndex] || '',
                      bold: rowIndex === 0,
                      color:
                        rowIndex === 0 ? 'FFFFFF' : '252525',
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                  spacing: { after: 40, line: 260 },
                }),
              ],
            })
          ),
        })
      );

      children.push(
        new Table({
          rows: tableRows,
          width: {
            size: 9000,
            type: WidthType.DXA,
          },
          columnWidths: Array(columnCount).fill(colWidth),
          borders: {
            top: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
            left: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
            right: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: 'D1D5DB',
            },
          },
        })
      );

      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 120 },
        })
      );
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        flushTable();
        continue;
      }

      if (line.startsWith('|')) {
        flushParagraph();
        tableBuffer.push(
          line.split('|').slice(1, -1).map((cell) => cell.trim())
        );
        continue;
      }

      flushTable();

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

      if (headingMatch) {
        flushParagraph();

        const level = headingMatch[1].length;

        children.push(
          new Paragraph({
            text: cleanInline(headingMatch[2]),
            heading:
              level === 1
                ? HeadingLevel.HEADING_1
                : level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            keepNext: true,
            spacing: {
              before: level === 1 ? 260 : 180,
              after: 100,
            },
          })
        );

        continue;
      }

      if (/^[-*+]\s+/.test(line)) {
        flushParagraph();

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanInline(line.replace(/^[-*+]\s+/, '')),
                font: 'Times New Roman',
                size: 24,
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 80, line: 320 },
          })
        );

        continue;
      }

      if (/^\d+[.)]\s+/.test(line)) {
        flushParagraph();

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanInline(line.replace(/^\d+[.)]\s+/, '')),
                font: 'Times New Roman',
                size: 24,
              }),
            ],
            numbering: {
              reference: 'gliteco-numbering',
              level: 0,
            },
            spacing: { after: 80, line: 320 },
          })
        );

        continue;
      }

      paragraphBuffer.push(line);
    }

    flushParagraph();
    flushTable();

    if (children.length === 0) {
      children.push(
        new Paragraph({
          text: 'No readable document content was found. Please regenerate the document.',
        })
      );
    }

    const doc = new Document({
      creator: 'Gliteco AI',
      title: 'Document created with Gliteco AI',
      description: 'Professional document exported from Gliteco AI',

      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24,
              color: '252525',
            },
            paragraph: {
              spacing: { line: 360, after: 120 },
            },
          },
        },
      },

      numbering: {
        config: [
          {
            reference: 'gliteco-numbering',
            levels: [
              {
                level: 0,
                format: 'decimal',
                text: '%1.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: {
                      left: 720,
                      hanging: 360,
                    },
                  },
                },
              },
            ],
          },
        ],
      },

      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1200,
                bottom: 1440,
                left: 1200,
              },
            },
          },

          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Created with Gliteco AI | Page ',
                      font: 'Times New Roman',
                      size: 18,
                      color: '777777',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: 'Times New Roman',
                      size: 18,
                      color: '777777',
                    }),
                  ],
                }),
              ],
            }),
          },

          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);

    saveBlob(
      blob,
      `${brandName.toLowerCase()}-document.docx`
    );
  } catch (error) {
    console.error('DOCX generation failed:', error);
    alert('DOCX could not be generated. Please try again.');
  }
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
        text: `Try ${brandName} — Free AI Chat, HD Image & Video Studio, App Builder, PPT & PDF Maker!`,
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
            { id: 'image', label: 'HD Image Studio', icon: ImageIcon },
            { id: 'video', label: 'AI Video Studio', icon: Video },
            { id: 'dev', label: 'App & Web Designer', icon: Layers },
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

        {/* Main Visual & Chat Canvas */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
          {messages.length === 0 && generatedImages.length === 0 && generatedVideos.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {user.isGuest
                  ? `Ask, Upload & Create Anything with ${brandName}`
                  : `Welcome back, ${user.name}!`}
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Generate photorealistic HD images, cinematic motion videos, full interactive apps, PPT slides, and PDFs
                from a single easy prompt.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  { label: 'New Year poster', mode: 'image', text: 'Create a colorful Happy New Year 2027 greeting poster with fireworks and golden confetti' },
                  { label: 'Profile photo (attach your photo)', mode: 'image', text: 'Professional LinkedIn headshot in a navy blazer with a soft studio background' },
                  { label: 'Product ad', mode: 'image', text: 'Create a clean product advertisement poster for a handmade candle on a wooden table with warm light' },
                  { label: 'Birthday wish poster', mode: 'image', text: 'Create a cheerful birthday wish poster with balloons, a cake and confetti' },
                  { label: 'Short video', mode: 'video', text: 'A sleek electric sports car driving through a city at night' },
                  { label: 'Make an app', mode: 'dev', text: 'Design a complete food delivery app with menu, cart & checkout' },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setMode(t.mode as any);
                      setInput(t.text);
                    }}
                    className="text-xs px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500 text-zinc-300"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(() => {
            messages.forEach((m, idx) => {
              if (!msgTimesRef.current[m.id]) {
                msgTimesRef.current[m.id] = Date.now() + idx;
              }
            });

            type FeedEntry =
              | { kind: 'msg'; time: number; data: any }
              | { kind: 'img'; time: number; data: { id: string; prompt: string; url: string } }
              | { kind: 'vid'; time: number; data: GeneratedVideoItem };

            const feed: FeedEntry[] = [
              ...messages.map((m) => ({ kind: 'msg' as const, time: msgTimesRef.current[m.id] || 0, data: m })),
              ...generatedImages.map((img) => ({ kind: 'img' as const, time: Number(img.id) || 0, data: img })),
              ...generatedVideos.map((vid) => ({ kind: 'vid' as const, time: Number(vid.id) || 0, data: vid })),
            ].sort((a, b) => a.time - b.time);

            return feed.map((entry) => {
              if (entry.kind === 'img') {
                const img = entry.data;
                return (
                  <div key={`img-${img.id}`} className="space-y-2">
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
                              <RotateCcw className="w-3.5 h-3.5" /> Retry Image
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
                            <div className="flex items-center justify-between pt-1">
                              <a
                                href={img.url}
                                download={`${brandName.toLowerCase()}-design.jpg`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                              >
                                <Download className="w-3.5 h-3.5" /> Save HD Image / Logo
                              </a>
                              <button
                                onClick={() => retryImage(img.id, img.prompt)}
                                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                              >
                                <RotateCcw className="w-3 h-3" /> Regenerate
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (entry.kind === 'vid') {
                return <CinematicVideoCard key={`vid-${entry.data.id}`} video={entry.data} />;
              }

              const m = entry.data;
              const textContent = m.parts
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('');
              const imageParts = m.parts.filter(
                (part: any) => part.type === 'file' && part.mediaType?.startsWith('image/')
              );
              const htmlCode = m.role === 'assistant' ? extractHtmlBlock(textContent) : null;
              const cleanText = textContent.replace(/```html[\s\S]*?(```|$)/gi, '').trim();
              const isDesigningApp = m.role === 'assistant' && isLoading && /```html/i.test(textContent) && !htmlCode;
              const isSpeakingThis = speakingMsgId === m.id;
              const displayUserText = m.role === 'user' ? textContent.split('\n\n[Uploaded File:')[0] : textContent;

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
                        <Wand2 className="w-4 h-4 text-indigo-400 animate-spin" />
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
                            <Play className="w-4 h-4" /> Open Finished App
                          </button>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-4">
                          <button
                            onClick={() => downloadStandaloneApp(htmlCode)}
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            <Download className="w-3.5 h-3.5" /> Save App to Device
                          </button>
                          <a
                            href="https://www.hostinger.in"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            Host This Website Online
                          </a>
                        </div>
                      </div>
                    )}

                   
{m.role === 'assistant' && textContent && !htmlCode && !isDesigningApp && (
                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => toggleSpeakText(m.id, textContent)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-indigo-400"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Listen
                        </button>
                        <button
                          onClick={() => downloadPDF(textContent)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400"
                        >
                          <FileText className="w-3.5 h-3.5" /> Download PDF
                        </button>
                        <button
                          onClick={() => downloadDOCX(textContent)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-400"
                        >
                          <FileText className="w-3.5 h-3.5" /> Download DOCX
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          {isGeneratingMedia && (
            <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 flex items-center gap-3 text-xs text-indigo-200">
              <Wand2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0"/>
              <span>{mediaKind === 'video' ? 'Creating your video... this can take up to a minute. Please keep this tab open.' : 'Generating your image... this usually takes 5-20 seconds.'}</span>
            </div>
          )}

          {mediaError && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between gap-3 text-xs text-red-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0"/>
                <span className="break-words">{mediaError}</span>
              </div>
              <button
                onClick={() => setMediaError(null)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

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

        {/* Input Bar */}
        <footer className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <div className="max-w-3xl mx-auto mb-2 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>
              Free tries left today: <span className={pointsLeft === 0 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{pointsLeft}</span> of {DAILY_POINTS}
              {' '}(image = {IMAGE_COST}, video = {VIDEO_COST})
            </span>
            <span className="hidden sm:inline">Tip: use a clear, front-facing photo of one person</span>
          </div>
          {lastUploadedImage && attachments.length === 0 && (
            <div className="max-w-3xl mx-auto flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200">
              <img src={lastUploadedImage} alt="Reference" className="w-6 h-6 rounded object-cover" />
              <span>Reference photo active for next image/video edit</span>
              <button type="button" onClick={() => setLastUploadedImage(undefined)} className="ml-auto text-zinc-400 hover:text-red-400">Clear</button>
            </div>
          )}
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
              placeholder={
                mode === 'image'
                  ? 'Describe any HD image, logo, or poster...'
                  : mode === 'video'
                    ? 'Describe any video scene to animate...'
                    : 'Ask Gliteco anything...'
              }
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
            By using {brandName}, you agree to our Terms of Use. Supports HD Images, Videos, Apps, PDFs & Documents 100% Free.
          </p>
        </footer>
      </div>
    </div>
  );
}