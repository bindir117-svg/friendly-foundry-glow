import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Note {
  id: string;
  text: string;
  createdAt: number;
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: "Forex үндэс", message: "Forex гэж юу вэ? Надад дэлгэрэнгүй, жишээтэй тайлбарлаж өгөөч." },
  { icon: BarChart3, label: "EURUSD шинжилгээ", message: "EURUSD валют хосын дэлгэрэнгүй техникийн дүн шинжилгээ хийж өгөөч." },
  { icon: Shield, label: "Risk Management", message: "Мөнгө удирдлагын үндэс, Risk per trade хэрхэн тооцоолох талаар дэлгэрэнгүй сургаач." },
  { icon: TrendingUp, label: "Price Action", message: "Price Action гэж юу вэ? Market structure, Order Block, FVG зэргийг дэлгэрэнгүй заагаач." },
];

const NOTES_KEY = "mandarin_notes";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTES_KEY);
      if (saved) setNotes(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamReply = async (allMessages: Message[]) => {
    setMessages([...allMessages, { role: "assistant", content: "" }]);

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
          if (delta) {
            assistantText += delta;
            setMessages([...allMessages, { role: "assistant", content: assistantText }]);
          }
        } catch { /* skip non-json */ }
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
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

  const handleNewChat = () => {
    setSparkle(true);
    setTimeout(() => setSparkle(false), 600);
    setTimeout(() => {
      setMessages([]);
      setInput("");
      inputRef.current?.focus();
    }, 200);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([{ id: crypto.randomUUID(), text: newNote.trim(), createdAt: Date.now() }, ...notes]);
    setNewNote("");
  };

  const removeNote = (id: string) => setNotes(notes.filter((n) => n.id !== id));

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      {/* Top Bar */}
      <header className="relative flex items-center justify-between px-5 py-3 border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_24px_hsl(var(--primary)/0.5)] animate-star-pulse">
              <Star className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              MANDARIN
            </h1>
            <p className="text-[11px] text-muted-foreground">Forex AI Тренер</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotesOpen(true)}
            className="btn-luxury relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/60 text-foreground/80 hover:text-primary hover:border-primary/40 text-xs font-semibold"
            aria-label="Тэмдэглэл"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Тэмдэглэл</span>
            {notes.length > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="btn-luxury relative group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30 text-primary text-xs font-semibold overflow-hidden"
            >
              <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-500" />
              <span className="hidden sm:inline">Шинэ чат</span>
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
      <div className="flex-1 overflow-y-auto relative">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5 pb-8">
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
                  Forex-ийн талаар асуултаа бичээрэй. Анхан шатнаас ахисан түвшин хүртэл хамтдаа суралцана.
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
                  className={`max-w-[85%] py-2.5 px-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl rounded-br-md mt-3 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]"
                      : "text-white"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_p]:text-white [&_li]:text-white [&_li]:mb-1 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_strong]:text-primary [&_strong]:font-bold [&_a]:text-accent [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-white/80">
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Асуултаа бичнэ үү..."
              disabled={isLoading}
              className="bg-secondary/60 border-border/40 focus-visible:ring-primary/30 rounded-xl h-11 text-sm"
            />
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

      {/* Notes Drawer */}
      {notesOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setNotesOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-screen w-full sm:w-[400px] bg-card/95 backdrop-blur-xl border-l border-primary/20 z-50 flex flex-col shadow-[0_0_60px_hsl(var(--primary)/0.3)] animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold tracking-tight">Миний тэмдэглэл</h3>
              </div>
              <button
                onClick={() => setNotesOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border/40 space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Чухал гэж бодсон зүйлээ энд тэмдэглэ..."
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

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {notes.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Хоосон байна. Эхний тэмдэглэлээ нэмээрэй.
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="group relative p-3 rounded-lg border border-border/50 bg-background/60 hover:border-primary/30 transition-all"
                  >
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap pr-6 leading-relaxed">
                      {note.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {new Date(note.createdAt).toLocaleString("mn-MN")}
                    </p>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all"
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
    </div>
  );
};

export default Index;
