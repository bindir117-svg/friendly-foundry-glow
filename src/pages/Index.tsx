import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, TrendingUp, BarChart3, BookOpen, Shield, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: "Forex үндэс", message: "Forex гэж юу вэ? Надад энгийнээр тайлбарлаж өгөөч." },
  { icon: BarChart3, label: "EURUSD шинжилгээ", message: "EURUSD валют хосын дүн шинжилгээ хийж өгөөч." },
  { icon: Shield, label: "Risk Management", message: "Мөнгө удирдлагын үндэс сургаач. Risk per trade хэрхэн тооцоолох вэ?" },
  { icon: TrendingUp, label: "Price Action", message: "Price Action гэж юу вэ? Market structure хэрхэн уншихыг зааж өгөөч." },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("coach-chat", {
        body: { messages: newMessages },
      });

      if (error) throw error;

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Coach</h1>
            <p className="text-[11px] text-muted-foreground">Forex Тренер</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
            LIVE
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5 pb-8">
            <div className="w-full max-w-lg space-y-8">
              {/* Hero */}
              <div className="text-center space-y-3 pt-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Сайн уу, Trader
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Forex-ийн талаар асуултаа бичээрэй. Анхан шатнаас ахисан түвшин хүртэл хамтдаа суралцана.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm text-foreground/90 flex-1">{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] py-2.5 px-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md mt-3"
                      : "text-foreground/90"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_a]:text-primary">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="py-3 px-4">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
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
              className="rounded-xl h-11 w-11 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
            Forex өндөр эрсдэлтэй. Баталгаат ашиг амлахгүй. Шийдвэрийг та өөрөө гаргана.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Index;
