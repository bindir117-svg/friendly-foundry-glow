import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, MessageSquare, Loader2, Users, Shield, StickyNote, BookOpen, Plus, Edit3, Trash2, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}
interface Sess {
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
}
interface Msg {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  bg_color: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  level: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  content: string;
  order_index: number;
}

const Admin = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessionsByUser, setSessionsByUser] = useState<Record<string, Sess[]>>({});
  const [msgCount, setMsgCount] = useState<Record<string, number>>({});
  const [notesByUser, setNotesByUser] = useState<Record<string, Note[]>>({});
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedSession, setSelectedSession] = useState<Sess | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [tab, setTab] = useState<"chat" | "notes" | "lessons">("chat");
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Lessons admin state
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonLevelFilter, setLessonLevelFilter] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, created_at")
        .order("created_at", { ascending: false });
      const list = profs || [];
      setProfiles(list);

      const { data: sess } = await supabase
        .from("chat_sessions")
        .select("id, user_id, title, updated_at")
        .order("updated_at", { ascending: false });

      const grouped: Record<string, Sess[]> = {};
      const counts: Record<string, number> = {};
      (sess || []).forEach((s) => {
        if (!grouped[s.user_id]) grouped[s.user_id] = [];
        grouped[s.user_id].push(s);
        counts[s.user_id] = (counts[s.user_id] || 0) + 1;
      });
      setSessionsByUser(grouped);
      setMsgCount(counts);

      const { data: notes } = await supabase
        .from("notes")
        .select("id, user_id, title, content, bg_color, updated_at")
        .order("updated_at", { ascending: false });
      const noteGroup: Record<string, Note[]> = {};
      (notes || []).forEach((n: any) => {
        if (!noteGroup[n.user_id]) noteGroup[n.user_id] = [];
        noteGroup[n.user_id].push(n);
      });
      setNotesByUser(noteGroup);

      setLoading(false);
    })();
  }, []);

  const loadMessages = async (s: Sess) => {
    setSelectedSession(s);
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMsgs(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Admin</span>
        </div>
        <button onClick={signOut} className="text-xs text-muted-foreground hover:text-destructive">
          Гарах
        </button>
      </header>

      <div className="px-3 pt-3 flex gap-2">
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "chat" ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" /> Чат
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "notes" ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}
        >
          <StickyNote className="w-3.5 h-3.5 inline mr-1.5" /> Тэмдэглэл
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 min-h-0">
        {/* Users */}
        <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">Хэрэглэгчид ({profiles.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {profiles.map((p) => (
              <button
                key={p.user_id}
                onClick={() => { setSelectedUser(p); setSelectedSession(null); setMessages([]); }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedUser?.user_id === p.user_id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/40 hover:border-primary/30 hover:bg-secondary/40"
                }`}
              >
                <p className="text-sm font-medium truncate">{p.display_name || "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {msgCount[p.user_id] || 0} яриа · {(notesByUser[p.user_id] || []).length} тэмдэглэл
                </p>
              </button>
            ))}
          </div>
        </div>

        {tab === "chat" ? (
          <>
            {/* Sessions */}
            <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold">
                  Яриа {selectedUser ? `· ${selectedUser.display_name || selectedUser.email}` : ""}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {!selectedUser ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Хэрэглэгч сонгоно уу</p>
                ) : (sessionsByUser[selectedUser.user_id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Яриа байхгүй</p>
                ) : (
                  (sessionsByUser[selectedUser.user_id] || []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => loadMessages(s)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedSession?.id === s.id
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {new Date(s.updated_at).toLocaleString("mn-MN")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border/40">
                <h2 className="text-sm font-bold truncate">
                  {selectedSession ? selectedSession.title : "Мессеж"}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : !selectedSession ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Яриа сонгоно уу</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Хоосон</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] py-2 px-3 rounded-xl text-xs ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                          : "bg-secondary/60 text-foreground"
                      }`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-xs max-w-none [&_p]:mb-1.5 [&_p]:text-foreground [&_strong]:text-primary">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="md:col-span-2 bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold">
                Тэмдэглэл {selectedUser ? `· ${selectedUser.display_name || selectedUser.email}` : ""}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid sm:grid-cols-2 gap-2">
              {!selectedUser ? (
                <p className="text-xs text-muted-foreground text-center py-8 col-span-full">Хэрэглэгч сонгоно уу</p>
              ) : (notesByUser[selectedUser.user_id] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 col-span-full">Тэмдэглэл байхгүй</p>
              ) : (
                (notesByUser[selectedUser.user_id] || []).map((n) => (
                  <div key={n.id} className="rounded-lg p-3 text-white border" style={{ backgroundColor: n.bg_color || "#3b82f6" }}>
                    <p className="text-sm font-bold mb-1">{n.title}</p>
                    <p className="text-[11px] whitespace-pre-wrap line-clamp-6 opacity-90">{n.content}</p>
                    <p className="text-[10px] opacity-70 mt-2">{new Date(n.updated_at).toLocaleString("mn-MN")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
