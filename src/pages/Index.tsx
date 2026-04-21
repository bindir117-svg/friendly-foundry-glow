import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  BarChart3,
  BookOpen,
  Shield,
  TrendingUp,
  ChevronRight,
  Plus,
  Sparkles,
  Mic,
  MicOff,
  ArrowDown,
  History,
  MessageSquare,
  CandlestickChart,
  Image as ImageIcon,
  Palette,
  X,
  LogOut,
  Trash2,
  Loader2,
  StickyNote,
  User as UserIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TopNav, MobileNav } from "@/components/AppNav";
import { useToast } from "@/hooks/use-toast";

interface MessagePart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}
interface Message {
  role: "user" | "assistant";
  content: string | MessagePart[];
  imagePreview?: string; // for displaying user-attached image
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: "Forex үндэс", message: "Forex гэж юу вэ? Надад дэлгэрэнгүй, жишээтэй тайлбарлаж өгөөч." },
  { icon: BarChart3, label: "EURUSD шинжилгээ", message: "EURUSD валют хосын дэлгэрэнгүй техникийн дүн шинжилгээ хийж өгөөч." },
  { icon: Shield, label: "Risk Management", message: "Мөнгө удирдлагын үндэс, Risk per trade хэрхэн тооцоолох талаар дэлгэрэнгүй сургаач." },
  { icon: TrendingUp, label: "Price Action", message: "Price Action гэж юу вэ? Market structure, Order Block, FVG зэргийг дэлгэрэнгүй заагаач." },
];

const FEATURE_CARDS = [
  { to: "/learn", icon: BookOpen, title: "Сургалт", desc: "АНХАН → АХИСАН шатлал", color: "from-green-500/20 to-emerald-500/10" },
  { to: "/analyze", icon: ImageIcon, title: "График шинжилгээ", desc: "Зураг оруулаад AI-аар шинжлүүл", color: "from-blue-500/20 to-cyan-500/10" },
  { to: "/design", icon: Palette, title: "AI Дизайн", desc: "Зураг үүсгэх", color: "from-pink-500/20 to-purple-500/10" },
  { to: "/notes", icon: StickyNote, title: "Тэмдэглэл", desc: "Journal + зураг", color: "from-yellow-500/20 to-orange-500/10" },
];

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showJumpDown, setShowJumpDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const stickToBottomRef = useRef(true);
  const activeIdRef = useRef<string | null>(null);

  // Sessions + messages from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sess } = await supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      if (!sess || sess.length === 0) { setSessions([]); return; }
      const ids = sess.map((s) => s.id);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("session_id, role, content, created_at")
        .in("session_id", ids)
        .order("created_at", { ascending: true });
      const grouped: Record<string, Message[]> = {};
      (msgs || []).forEach((m: any) => {
        if (!grouped[m.session_id]) grouped[m.session_id] = [];
        grouped[m.session_id].push({ role: m.role, content: m.content });
      });
      setSessions(sess.map((s) => ({
        id: s.id,
        title: s.title,
        messages: grouped[s.id] || [],
        updatedAt: new Date(s.updated_at).getTime(),
      })));
    })();
  }, [user]);

  // SCROLL
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottomRef.current = atBottom;
    setShowJumpDown(!atBottom && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const scrollToBottom = () => {
    stickToBottomRef.current = true;
    setShowJumpDown(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // STREAMING
  const streamReply = async (allMessages: Message[]) => {
    setMessages([...allMessages, { role: "assistant", content: "" }]);
    stickToBottomRef.current = true;

    // Build payload — convert MessagePart arrays back to OpenAI format
    const payloadMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { data: { session } } = await supabase.auth.getSession();
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/coach-chat`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: payloadMessages }),
    });

    if (!resp.ok || !resp.body) {
      let errMsg = "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.";
      try {
        const j = await resp.json();
        if (j?.error) errMsg = j.error;
      } catch { /* ignore */ }
      setMessages([...allMessages, { role: "assistant", content: errMsg }]);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    let charQueue: string[] = [];
    let typing = false;

    const typeNext = () => {
      if (charQueue.length === 0) {
        typing = false;
        return;
      }
      const batchSize = Math.max(1, Math.min(charQueue.length > 80 ? 6 : 2, charQueue.length));
      assistantText += charQueue.splice(0, batchSize).join("");
      const snapshot = assistantText;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: snapshot };
        return next;
      });
      requestAnimationFrame(typeNext);
    };

    const enqueue = (text: string) => {
      for (const ch of text) charQueue.push(ch);
      if (!typing) {
        typing = true;
        requestAnimationFrame(typeNext);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) enqueue(delta);
        } catch { /* skip */ }
      }
    }

    await new Promise<void>((resolve) => {
      const wait = () => {
        if (charQueue.length === 0 && !typing) resolve();
        else setTimeout(wait, 30);
      };
      wait();
    });
  };

  // SESSION
  const ensureSession = async (firstUserText: string): Promise<string | null> => {
    if (activeIdRef.current) return activeIdRef.current;
    if (!user) return null;
    const title = firstUserText.slice(0, 40) || "Шинэ яриа";
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (error || !data) return null;
    activeIdRef.current = data.id;
    setActiveSessionId(data.id);
    setSessions((prev) => [
      { id: data.id, title, messages: [], updatedAt: Date.now() },
      ...prev,
    ]);
    return data.id;
  };

  // IMAGE GENERATION INTENT DETECTION
  const isImageRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /\b(зураг|зурж|зурах|generate image|draw|design|illustration)\b/.test(lower) &&
           /\b(өг|хий|зурж|үүсг|оруул|generate|create|make|draw)\b/.test(lower);
  };

  const generateImageInChat = async (prompt: string, sessionId: string) => {
    setGeneratingImage(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "🎨 Зураг үүсгэж байна..." }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-image`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.error || "Зураг үүсгэж чадсангүй";
        setMessages((prev) => {
          const n = [...prev];
          n[n.length - 1] = { role: "assistant", content: `❌ ${errMsg}` };
          return n;
        });
        return;
      }
      const md = `![generated](${data.imageUrl})\n\n*Prompt: ${prompt}*`;
      setMessages((prev) => {
        const n = [...prev];
        n[n.length - 1] = { role: "assistant", content: md };
        return n;
      });
      // Persist
      if (user) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: md,
        });
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  // SEND
  const sendMessage = async (content: string) => {
    if ((!content.trim() && !attachedImage) || isLoading || !user) return;
    const text = content.trim();
    const sessionId = await ensureSession(text || "Зурагтай мессеж");
    if (!sessionId) return;

    // Build user message — string OR multi-part with image
    let userMessage: Message;
    let dbContent: string;
    const localImage = attachedImage;

    if (localImage) {
      userMessage = {
        role: "user",
        content: [
          { type: "text", text: text || "Энэ зургийг шинжилж өгөөч" },
          { type: "image_url", image_url: { url: localImage } },
        ],
        imagePreview: localImage,
      };
      dbContent = `[📷 Зураг] ${text}`;
    } else {
      userMessage = { role: "user", content: text };
      dbContent = text;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setAttachedImage(null);
    setIsLoading(true);
    stickToBottomRef.current = true;

    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: dbContent,
    });

    try {
      // Image generation intent → only if no attached image
      if (!localImage && isImageRequest(text)) {
        await generateImageInChat(text, sessionId);
      } else {
        await streamReply(newMessages);
        setMessages((curr) => {
          const last = curr[curr.length - 1];
          if (last && last.role === "assistant" && typeof last.content === "string" && last.content) {
            supabase.from("chat_messages").insert({
              session_id: sessionId,
              user_id: user.id,
              role: "assistant",
              content: last.content,
            }).then(() => {
              supabase.from("chat_sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", sessionId)
                .then(() => {});
            });
            setSessions((prev) => {
              const idx = prev.findIndex((s) => s.id === sessionId);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], messages: curr, updatedAt: Date.now() };
              const [act] = next.splice(idx, 1);
              return [act, ...next];
            });
          }
          return curr;
        });
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу." },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Зураг хэт том (5MB-аас бага)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startNewChat = () => {
    setSparkle(true);
    setTimeout(() => setSparkle(false), 600);
    setTimeout(() => {
      activeIdRef.current = null;
      setActiveSessionId(null);
      setMessages([]);
      setInput("");
      setAttachedImage(null);
      stickToBottomRef.current = true;
      inputRef.current?.focus();
    }, 150);
  };

  const goHome = () => {
    setMessages([]);
    activeIdRef.current = null;
    setActiveSessionId(null);
  };

  const openSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    activeIdRef.current = id;
    setActiveSessionId(id);
    setMessages(s.messages);
    setHistoryOpen(false);
    stickToBottomRef.current = true;
  };

  const deleteSession = async (id: string) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  // VOICE
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Дуун таних боломжгүй", description: "Chrome ашиглана уу.", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "mn-MN";
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const renderUserContent = (msg: Message) => {
    if (msg.imagePreview) {
      const text = Array.isArray(msg.content)
        ? msg.content.find((p: any) => p.type === "text")?.text
        : msg.content;
      return (
        <div className="space-y-2">
          <img src={msg.imagePreview} alt="" className="rounded-lg max-w-[260px] max-h-[260px] object-cover" />
          {text && <div>{text}</div>}
        </div>
      );
    }
    if (typeof msg.content === "string" && msg.content.startsWith("[📷 Зураг]")) {
      return msg.content.replace("[📷 Зураг]", "📷").trim();
    }
    return typeof msg.content === "string" ? msg.content : "";
  };

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden pb-16 md:pb-0">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      {/* Top Bar */}
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-10 shrink-0">
        <button
          onClick={goHome}
          className="btn-luxury flex items-center gap-3 group"
          aria-label="Нүүр"
        >
          {/* STATIC LOGO — no rotation/animation */}
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_hsl(var(--primary)/0.45)]" />
            <div className="absolute inset-[1.5px] rounded-[10px] bg-gradient-to-br from-background via-secondary to-background flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <line x1="6" y1="4" x2="6" y2="20" stroke="hsl(var(--destructive))" strokeWidth="1" />
                <rect x="4" y="8" width="4" height="8" fill="hsl(var(--destructive))" rx="0.5" />
                <line x1="12" y1="3" x2="12" y2="21" stroke="hsl(var(--primary))" strokeWidth="1" />
                <rect x="10" y="6" width="4" height="11" fill="hsl(var(--primary))" rx="0.5" />
                <line x1="18" y1="2" x2="18" y2="18" stroke="hsl(var(--primary))" strokeWidth="1" />
                <rect x="16" y="4" width="4" height="10" fill="hsl(var(--primary))" rx="0.5" />
                <path d="M3 21 L12 14 L15 16 L21 11" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              MNDRIN
            </h1>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase">Forex AI Тренер</p>
          </div>
        </button>

        <TopNav />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHistoryOpen(true)}
            className="btn-luxury relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/60 border border-border/60 text-foreground/80 hover:text-primary hover:border-primary/40 text-xs font-semibold"
            aria-label="Чатын түүх"
          >
            <History className="w-3.5 h-3.5" />
            {sessions.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">
                {sessions.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              className="btn-luxury relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30 text-primary text-xs font-semibold overflow-hidden"
              aria-label="Шинэ чат"
            >
              <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-500" />
              {sparkle && (
                <>
                  <Sparkles className="absolute top-0 left-2 w-3 h-3 text-primary animate-sparkle" />
                  <Sparkles className="absolute bottom-0 right-2 w-3 h-3 text-accent animate-sparkle" />
                </>
              )}
            </button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="btn-luxury flex items-center justify-center w-8 h-8 rounded-full bg-secondary/60 border border-border/60 text-foreground/70 hover:text-destructive hover:border-destructive/40"
                aria-label="Exit"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit?</AlertDialogTitle>
                <AlertDialogDescription>
                  Та системээс гарах гэж байна. Үнэхээр гарах уу?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Үгүй</AlertDialogCancel>
                <AlertDialogAction
                  onClick={signOut}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Exit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain luxury-scroll">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full px-5 pb-8">
              <div className="w-full max-w-2xl space-y-7">
                {/* Hero */}
                <div className="text-center space-y-3 pt-8 animate-fade-up">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_50px_hsl(var(--primary)/0.6)]" />
                    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-background via-secondary to-background border border-primary/40 flex items-center justify-center">
                      <CandlestickChart className="w-10 h-10 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                    Юу мэдмээр байна?
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Forex-ийн талаар асуултаа бичээрэй, зураг оруулаад шинжлүүлээрэй, эсвэл "зураг зурж өг" гэж хэлээрэй.
                  </p>
                </div>

                {/* Feature cards (Сургалт + бусад) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-fade-up">
                  {FEATURE_CARDS.map((c) => (
                    <Link
                      key={c.to}
                      to={c.to}
                      className={`btn-luxury group relative overflow-hidden rounded-xl p-3 border border-border/60 bg-gradient-to-br ${c.color} hover:border-primary/50`}
                    >
                      <c.icon className="w-5 h-5 text-primary mb-2" />
                      <div className="text-xs font-semibold">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{c.desc}</div>
                    </Link>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2 animate-fade-up">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.message)}
                      className="btn-luxury w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-card hover:border-primary/50 group text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm text-foreground/90 flex-1 font-medium">{action.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex animate-fade-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] py-2.5 px-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl rounded-br-md mt-3 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]"
                        : "text-white"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_p]:text-white [&_li]:text-white [&_li]:mb-1 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_strong]:text-primary [&_strong]:font-bold [&_a]:text-accent [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-white/80 [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full">
                        <ReactMarkdown>{(typeof msg.content === "string" ? msg.content : "") || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      renderUserContent(msg)
                    )}
                  </div>
                </div>
              ))}
              {(isLoading || generatingImage) && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="py-3 px-4">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms] shadow-[0_0_8px_hsl(var(--primary))]" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms] shadow-[0_0_8px_hsl(var(--primary))]" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms] shadow-[0_0_8px_hsl(var(--primary))]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="relative border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 shrink-0">
        {showJumpDown && (
          <button
            onClick={scrollToBottom}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full bg-card/95 backdrop-blur border border-primary/40 text-primary shadow-[0_4px_20px_hsl(var(--primary)/0.4)] flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all animate-fade-in"
            aria-label="Доошлох"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Attached image preview */}
        {attachedImage && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="relative inline-block">
              <img src={attachedImage} alt="" className="h-20 w-20 object-cover rounded-lg border border-primary/40" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                aria-label="Хасах"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              className="btn-luxury rounded-xl h-11 w-11 shrink-0 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
              aria-label="Зураг хавсаргах"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />

            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Сонсож байна..." : attachedImage ? "Зургийн талаар асуу..." : "Асуултаа бичнэ үү... ('зураг зурж өг' гэж асуу)"}
              disabled={isLoading}
              className="bg-secondary/60 border-border/40 focus-visible:ring-primary/30 rounded-xl h-11 text-sm"
            />
            <Button
              type="button"
              size="icon"
              onClick={toggleVoice}
              disabled={isLoading}
              className={`btn-luxury rounded-xl h-11 w-11 shrink-0 ${
                isListening
                  ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                  : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
              }`}
              aria-label={isListening ? "Зогсоох" : "Дуугаар асуух"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!input.trim() && !attachedImage)}
              className="btn-luxury rounded-xl h-11 w-11 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
            Forex өндөр эрсдэлтэй. Баталгаат ашиг амлахгүй. Шийдвэрийг та өөрөө гаргана.
          </p>
        </form>
      </div>

      {/* History Drawer */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-screen w-full sm:w-[380px] bg-card/95 backdrop-blur-xl border-l border-primary/20 z-50 flex flex-col shadow-[0_0_60px_hsl(var(--primary)/0.3)] animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold tracking-tight">Чатын түүх</h3>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
                aria-label="Хаах"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-border/40">
              <Button
                onClick={() => { startNewChat(); setHistoryOpen(false); }}
                className="btn-luxury w-full rounded-lg gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Шинэ чат эхлүүлэх
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto luxury-scroll p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Хадгалагдсан чат байхгүй.
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group relative rounded-lg border transition-all ${
                      s.id === activeSessionId
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/40 bg-background/40 hover:border-primary/30 hover:bg-background/70"
                    }`}
                  >
                    <button
                      onClick={() => openSession(s.id)}
                      className="w-full text-left p-3 pr-9"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/90 truncate">
                            {s.title || "Шинэ чат"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {new Date(s.updatedAt).toLocaleString("mn-MN")} · {s.messages.length} мессеж
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all"
                      aria-label="Устгах"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      <MobileNav />
    </div>
  );
};

export default Index;
