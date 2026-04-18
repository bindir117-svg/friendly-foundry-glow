import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Star,
  BarChart3,
  BookOpen,
  Shield,
  TrendingUp,
  ChevronRight,
  Plus,
  Sparkles,
  StickyNote,
  X,
  Save,
  Trash2,
  Mic,
  MicOff,
  ArrowDown,
  History,
  MessageSquare,
  Pencil,
  Check,
  Palette,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface Note {
  id: string;
  title: string;
  text: string;
  color: string;
  createdAt: number;
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: "Forex үндэс", message: "Forex гэж юу вэ? Надад дэлгэрэнгүй, жишээтэй тайлбарлаж өгөөч." },
  { icon: BarChart3, label: "EURUSD шинжилгээ", message: "EURUSD валют хосын дэлгэрэнгүй техникийн дүн шинжилгээ хийж өгөөч." },
  { icon: Shield, label: "Risk Management", message: "Мөнгө удирдлагын үндэс, Risk per trade хэрхэн тооцоолох талаар дэлгэрэнгүй сургаач." },
  { icon: TrendingUp, label: "Price Action", message: "Price Action гэж юу вэ? Market structure, Order Block, FVG зэргийг дэлгэрэнгүй заагаач." },
];

const NOTES_KEY = "mandarin_notes_v2";
const SESSIONS_KEY = "mandarin_sessions_v1";
const ACTIVE_SESSION_KEY = "mandarin_active_session_v1";

const NOTE_COLORS = [
  { name: "Pink", value: "330 85% 60%" },
  { name: "Purple", value: "280 75% 60%" },
  { name: "Blue", value: "210 85% 60%" },
  { name: "Green", value: "150 65% 50%" },
  { name: "Orange", value: "25 90% 60%" },
  { name: "Yellow", value: "45 90% 55%" },
];

const Index = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showJumpDown, setShowJumpDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const stickToBottomRef = useRef(true);
  const activeIdRef = useRef<string | null>(null);

  // ============ LOAD ============
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(NOTES_KEY);
      if (savedNotes) setNotes(JSON.parse(savedNotes));

      const savedSessions = localStorage.getItem(SESSIONS_KEY);
      if (savedSessions) {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        setSessions(parsed);
        const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
        const active = parsed.find((s) => s.id === activeId);
        if (active) {
          setActiveSessionId(active.id);
          setMessages(active.messages);
          activeIdRef.current = active.id;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ============ PERSIST ============
  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  }, [activeSessionId]);

  // Auto-save active session when messages update
  useEffect(() => {
    if (!activeIdRef.current || messages.length === 0) return;
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeIdRef.current);
      const firstUser = messages.find((m) => m.role === "user");
      const title = firstUser ? firstUser.content.slice(0, 40) : "Шинэ чат";
      if (idx === -1) {
        return [
          { id: activeIdRef.current!, title, messages, updatedAt: Date.now() },
          ...prev,
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], title: next[idx].title || title, messages, updatedAt: Date.now() };
      // Move active to top
      const [active] = next.splice(idx, 1);
      return [active, ...next];
    });
  }, [messages]);

  // ============ SCROLL ============
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

  // ============ STREAMING ============
  const streamReply = async (allMessages: Message[]) => {
    setMessages([...allMessages, { role: "assistant", content: "" }]);
    stickToBottomRef.current = true;

    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/coach-chat`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: allMessages }),
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
      // Хэт удаан биш — нэг кадрт олон тэмдэгт нэм. Хэрэв queue их бол хурдан гарга.
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

    // Wait until typing queue drained
    await new Promise<void>((resolve) => {
      const wait = () => {
        if (charQueue.length === 0 && !typing) resolve();
        else setTimeout(wait, 30);
      };
      wait();
    });
  };

  // ============ MESSAGES ============
  const ensureSession = () => {
    if (!activeIdRef.current) {
      const id = crypto.randomUUID();
      activeIdRef.current = id;
      setActiveSessionId(id);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    ensureSession();
    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    stickToBottomRef.current = true;
    try {
      await streamReply(newMessages);
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

  // ============ NEW CHAT / HOME ============
  const startNewChat = () => {
    setSparkle(true);
    setTimeout(() => setSparkle(false), 600);
    setTimeout(() => {
      activeIdRef.current = null;
      setActiveSessionId(null);
      setMessages([]);
      setInput("");
      stickToBottomRef.current = true;
      inputRef.current?.focus();
    }, 150);
  };

  const goHome = () => {
    // Logo click — буцаад home, идэвхтэй чат хадгалагдсан хэвээр.
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

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  // ============ VOICE ============
  const toggleVoice = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Таны хөтчид дуун таних боломжгүй байна. Chrome ашиглана уу.");
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

  // ============ NOTES ============
  const addNote = () => {
    if (!newNote.trim()) return;
    const lines = newNote.trim().split("\n");
    const title = lines[0].slice(0, 40) || "Тэмдэглэл";
    setNotes([
      {
        id: crypto.randomUUID(),
        title,
        text: newNote.trim(),
        color: NOTE_COLORS[0].value,
        createdAt: Date.now(),
      },
      ...notes,
    ]);
    setNewNote("");
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
    if (openedNoteId === id) setOpenedNoteId(null);
  };

  const updateNoteColor = (id: string, color: string) => {
    setNotes(notes.map((n) => (n.id === id ? { ...n, color } : n)));
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
    setEditTitle(note.title);
  };

  const saveEditNote = () => {
    if (!editingNoteId) return;
    setNotes(notes.map((n) =>
      n.id === editingNoteId ? { ...n, text: editText.trim(), title: editTitle.trim() || "Тэмдэглэл" } : n
    ));
    setEditingNoteId(null);
  };

  const openedNote = notes.find((n) => n.id === openedNoteId);

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
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
          <div className="relative w-11 h-11">
            {/* Outer rotating gradient ring */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary via-accent to-primary opacity-70 blur-md logo-ring" />
            {/* Spinning conic border */}
            <div
              className="absolute inset-0 rounded-2xl logo-orbit"
              style={{
                background:
                  "conic-gradient(from 0deg, hsl(330 85% 60%), hsl(290 80% 55%), hsl(330 85% 60%), hsl(320 90% 70%), hsl(330 85% 60%))",
                padding: "1.5px",
              }}
            >
              <div className="w-full h-full rounded-2xl bg-background" />
            </div>
            {/* Inner star plate */}
            <div className="absolute inset-[3px] rounded-[10px] bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-[inset_0_1px_2px_hsl(0_0%_100%/0.3),0_0_24px_hsl(var(--primary)/0.6)] overflow-hidden">
              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 logo-shimmer"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.35) 50%, transparent 70%)",
                }}
              />
              <Star className="relative w-5 h-5 text-primary-foreground fill-primary-foreground drop-shadow-[0_0_4px_hsl(0_0%_100%/0.6)]" />
            </div>
            {/* Pulse dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent text-glow">
              MNDRIN
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Forex AI Тренер</p>
          </div>
        </button>

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

          <button
            onClick={() => setNotesOpen(true)}
            className="btn-luxury relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/60 border border-border/60 text-foreground/80 hover:text-primary hover:border-primary/40 text-xs font-semibold"
            aria-label="Тэмдэглэл"
          >
            <StickyNote className="w-3.5 h-3.5" />
            {notes.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              className="btn-luxury relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30 text-primary text-xs font-semibold overflow-hidden"
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
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain luxury-scroll">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full px-5 pb-8">
              <div className="w-full max-w-lg space-y-7">
                {/* Hero */}
                <div className="text-center space-y-3 pt-8 animate-fade-up">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_50px_hsl(var(--primary)/0.6)] animate-star-pulse" />
                    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Star className="w-10 h-10 text-primary-foreground fill-primary-foreground" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                    Hi hii, Bin Dir-н баруун гар байна
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Forex-ийн талаар асуултаа бичээрэй эсвэл дуугаараа ярь. Анхан шатнаас ахисан түвшин хүртэл хамтдаа суралцана.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2 animate-fade-up">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.message)}
                      className="btn-luxury w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-card hover:border-primary/50 group text-left"
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
                      <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_p]:text-white [&_li]:text-white [&_li]:mb-1 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_strong]:text-primary [&_strong]:font-bold [&_a]:text-accent [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-white/80">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
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

      {/* Input Area + Floating jump-down */}
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
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Сонсож байна..." : "Асуултаа бичнэ үү..."}
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
              disabled={isLoading || !input.trim()}
              className="btn-luxury rounded-xl h-11 w-11 shrink-0"
            >
              <Send className="w-4 h-4" />
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

      {/* Notes Drawer */}
      {notesOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => { setNotesOpen(false); setOpenedNoteId(null); setEditingNoteId(null); }}
          />
          <aside className="fixed right-0 top-0 h-screen w-full sm:w-[400px] bg-card/95 backdrop-blur-xl border-l border-primary/20 z-50 flex flex-col shadow-[0_0_60px_hsl(var(--primary)/0.3)] animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold tracking-tight">
                  {openedNote ? "Тэмдэглэл" : "Миний тэмдэглэл"}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (openedNote) { setOpenedNoteId(null); setEditingNoteId(null); }
                  else setNotesOpen(false);
                }}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opened note view */}
            {openedNote ? (
              <div className="flex-1 overflow-y-auto luxury-scroll p-4">
                <div
                  className="rounded-2xl p-5 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.4)]"
                  style={{
                    backgroundColor: `hsl(${openedNote.color})`,
                  }}
                >
                  {editingNoteId === openedNote.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Гарчиг"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60 font-bold"
                      />
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60 min-h-[200px] resize-none"
                      />
                      <Button onClick={saveEditNote} size="sm" className="w-full bg-white text-foreground hover:bg-white/90 gap-2">
                        <Check className="w-4 h-4" /> Хадгалах
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-lg font-bold text-white mb-3 leading-snug">
                        {openedNote.title}
                      </h4>
                      <p className="text-sm text-white/95 whitespace-pre-wrap leading-relaxed">
                        {openedNote.text}
                      </p>
                      <p className="text-[10px] text-white/70 mt-4">
                        {new Date(openedNote.createdAt).toLocaleString("mn-MN")}
                      </p>
                    </>
                  )}
                </div>

                {/* Color picker + actions */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Өнгө сонгох</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateNoteColor(openedNote.id, c.value)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          openedNote.color === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: `hsl(${c.value})` }}
                        aria-label={c.name}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => editingNoteId === openedNote.id ? saveEditNote() : startEditNote(openedNote)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      {editingNoteId === openedNote.id ? <><Check className="w-4 h-4" /> Хадгалах</> : <><Pencil className="w-4 h-4" /> Засах</>}
                    </Button>
                    <Button
                      onClick={() => removeNote(openedNote.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      <Trash2 className="w-4 h-4" /> Устгах
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Add note form */}
                <div className="p-4 border-b border-border/40 space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Чухал гэж бодсон зүйлээ энд тэмдэглэ... (эхний мөр гарчиг болно)"
                    className="bg-secondary/60 border-border/40 focus-visible:ring-primary/30 rounded-lg text-sm min-h-[90px] resize-none"
                  />
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim()}
                    className="btn-luxury w-full rounded-lg gap-2"
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                    Тэмдэглэл хадгалах
                  </Button>
                </div>

                {/* Notes grid */}
                <div className="flex-1 overflow-y-auto luxury-scroll p-3">
                  {notes.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Хоосон байна. Эхний тэмдэглэлээ нэмээрэй.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {notes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => setOpenedNoteId(note.id)}
                          className="btn-luxury group relative rounded-xl p-3 text-left aspect-square shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 transition-all overflow-hidden"
                          style={{ backgroundColor: `hsl(${note.color})` }}
                        >
                          <h4 className="text-sm font-bold text-white leading-tight line-clamp-3">
                            {note.title}
                          </h4>
                          <p className="absolute bottom-2 left-3 text-[9px] text-white/70">
                            {new Date(note.createdAt).toLocaleDateString("mn-MN")}
                          </p>
                          <StickyNote className="absolute top-2 right-2 w-3.5 h-3.5 text-white/50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

export default Index;
