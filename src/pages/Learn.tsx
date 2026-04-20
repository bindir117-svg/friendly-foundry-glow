import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, BookOpen, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface Lesson {
  id: string;
  level: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  content: string;
  order_index: number;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: "АНХАН",
  intermediate: "ДУНД",
  advanced: "АХИСАН",
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "bg-green-500/15 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/15 text-red-400 border-red-500/30",
};

const Learn = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ls } = await supabase
        .from("lessons")
        .select("*")
        .order("level", { ascending: true })
        .order("order_index", { ascending: true });
      setLessons((ls as Lesson[]) || []);

      if (user) {
        const { data: pr } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id);
        const map: Record<string, boolean> = {};
        (pr || []).forEach((p: any) => (map[p.lesson_id] = p.completed));
        setProgress(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const openLesson = async (lesson: Lesson) => {
    setActive(lesson);
    if (!user) return;
    // Upsert progress
    await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, lesson_id: lesson.id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
    setProgress((p) => ({ ...p, [lesson.id]: p[lesson.id] || false }));
  };

  const markComplete = async (lesson: Lesson) => {
    if (!user) return;
    await supabase
      .from("lesson_progress")
      .upsert(
        {
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
    setProgress((p) => ({ ...p, [lesson.id]: true }));
  };

  if (active) {
    return (
      <PageShell title={active.title}>
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Жагсаалт руу
          </Button>
          <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-xl border-border/50">
            <Badge className={`${LEVEL_COLOR[active.level]} mb-4`} variant="outline">
              {LEVEL_LABEL[active.level]}
            </Badge>
            <article className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary prose-li:text-foreground/90 prose-code:text-accent prose-code:bg-secondary prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{active.content}</ReactMarkdown>
            </article>
            <div className="mt-8 pt-6 border-t border-border/40 flex justify-between items-center">
              {progress[active.id] ? (
                <Badge className="bg-green-500/15 text-green-400 border-green-500/30" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Дууссан
                </Badge>
              ) : (
                <Button onClick={() => markComplete(active)} className="bg-gradient-to-r from-primary to-accent">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Хичээл дууссан
                </Button>
              )}
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  const groups = ["beginner", "intermediate", "advanced"] as const;

  return (
    <PageShell title="Сургалт">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Forex сургалтын модуль
          </h2>
          <p className="text-muted-foreground text-sm">
            Анхан түвшнээс ахисан хүртэл алхам алхмаар сур.
          </p>
        </div>

        {loading && <p className="text-muted-foreground">Уншиж байна...</p>}

        {groups.map((g) => {
          const items = lessons.filter((l) => l.level === g);
          if (items.length === 0) return null;
          const done = items.filter((l) => progress[l.id]).length;
          return (
            <section key={g}>
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${LEVEL_COLOR[g]}`} variant="outline">
                  {LEVEL_LABEL[g]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {done}/{items.length} дууссан
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => openLesson(l)}
                    className="text-left"
                  >
                    <Card className="p-4 h-full bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/50 hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        {progress[l.id] ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{l.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
};

export default Learn;
