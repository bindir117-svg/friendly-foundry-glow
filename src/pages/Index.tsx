import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import {
  MessageSquare, BookOpen, StickyNote, Palette, ImageIcon, Sparkles, ArrowRight, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import PageRenderer from "@/components/PageRenderer";
import { XPBadge } from "@/components/XPBadge";

interface RecentChat { id: string; title: string; updated_at: string; }
interface RecentNote { id: string; title: string; bg_color: string; updated_at: string; }

const FEATURES = [
  { to: "/chat", icon: MessageSquare, title: "AI Чат", desc: "Хувийн Forex тренертэй ярь", accent: "text-primary", border: "border-primary/40" },
  { to: "/learn", icon: BookOpen, title: "Сургалт", desc: "АНХАН → АХИСАН шатлал", accent: "text-bull", border: "border-bull/40" },
  { to: "/notes", icon: StickyNote, title: "Тэмдэглэл", desc: "Журнал, зураг, өнгө", accent: "text-info", border: "border-info/40" },
  { to: "/analyze", icon: ImageIcon, title: "График шинжилгээ", desc: "AI-ээр чартаа уншуул", accent: "text-violet", border: "border-violet/40" },
  { to: "/design", icon: Palette, title: "AI Дизайн", desc: "Зураг үүсгэх", accent: "text-accent", border: "border-accent/40" },
];

const Index = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [notes, setNotes] = useState<RecentNote[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [pRes, cRes, nRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("chat_sessions").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(4),
        supabase.from("notes").select("id, title, bg_color, updated_at").order("updated_at", { ascending: false }).limit(4),
      ]);
      setName(pRes.data?.display_name || user.email?.split("@")[0] || "Trader");
      setChats((cRes.data as RecentChat[]) || []);
      setNotes((nRes.data as RecentNote[]) || []);
    })();
  }, [user]);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Greeting */}
        <div className="space-y-2 animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" /> Тавтай морил
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Hi <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">{name}</span>,
          </h1>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground/90">Юу мэдмээр байна?</h2>
        </div>

        <XPBadge />

        <PageRenderer slug="home" />


        {/* Feature cards — black with pink frame */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {FEATURES.map((f, i) => (
            <Link
              key={f.to}
              to={f.to}
              className="group animate-fade-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <Card className={`relative overflow-hidden bg-black border-2 ${f.border} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:border-primary h-full`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <f.icon className={`w-7 h-7 mb-3 ${f.accent}`} />
                <h3 className="font-bold text-base mb-1 text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{f.desc}</p>
                <ArrowRight className="absolute bottom-3 right-3 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent chats + notes — side by side */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up">
          <Card className="p-5 bg-black border-2 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 text-foreground">
                <History className="w-4 h-4 text-primary" /> Сүүлийн чат
              </h3>
              <Link to="/chat" className="text-[11px] text-primary hover:underline">Бүгд →</Link>
            </div>
            {chats.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">Чат байхгүй. <Link to="/chat" className="text-primary hover:underline">Эхлүүлэх</Link></p>
            ) : (
              <div className="space-y-1.5">
                {chats.map((c) => (
                  <Link
                    key={c.id}
                    to="/chat"
                    className="block p-2.5 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(c.updated_at), "MM-dd HH:mm")}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 bg-black border-2 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 text-foreground">
                <StickyNote className="w-4 h-4 text-primary" /> Сүүлийн тэмдэглэл
              </h3>
              <Link to="/notes" className="text-[11px] text-primary hover:underline">Бүгд →</Link>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">Тэмдэглэл байхгүй. <Link to="/notes" className="text-primary hover:underline">Үүсгэх</Link></p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {notes.map((n) => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="block p-3 rounded-lg bg-primary text-primary-foreground hover:scale-[1.02] transition-transform shadow-[0_4px_20px_hsl(var(--primary)/0.3)]"
                  >
                    <p className="text-xs font-bold line-clamp-2">{n.title}</p>
                    <p className="text-[10px] opacity-70 mt-1">{format(new Date(n.updated_at), "MM-dd")}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default Index;
