import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Circle, BookOpen, ArrowLeft, ArrowRight, Lock,
  Trophy, GraduationCap, Sparkles, AlertCircle, RotateCcw, Loader2, StickyNote, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  level: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  content: string;
  order_index: number;
}
interface QuizQuestion {
  id: string;
  level: string;
  question: string;
  options: string[];
  correct_index: number;
  lesson_id: string | null;
  explanation: string;
  order_index: number;
}
interface QuizAttempt {
  id: string;
  level: string;
  score: number;
  total: number;
  passed: boolean;
  wrong_lesson_ids: string[];
  created_at: string;
}

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Level = typeof LEVELS[number];

const LEVEL_LABEL: Record<Level, string> = {
  beginner: "АНХАН",
  intermediate: "ДУНД",
  advanced: "АХИСАН",
};
const LEVEL_DESC: Record<Level, string> = {
  beginner: "Forex-н үндэс — хэлнээс эхэлж тэргүүлэх ойлголтууд хүртэл.",
  intermediate: "Техникийн анализ, мөнгө удирдлага, психологи.",
  advanced: "Smart Money Concepts, Order Block, FVG, MTF.",
};
const LEVEL_BADGE: Record<Level, string> = {
  beginner: "bg-bull/15 text-bull border-bull/40",
  intermediate: "bg-info/15 text-info border-info/40",
  advanced: "bg-violet/15 text-violet border-violet/40",
};
const LEVEL_GRADIENT: Record<Level, string> = {
  beginner: "from-bull/30 to-emerald-500/10",
  intermediate: "from-info/30 to-cyan-500/10",
  advanced: "from-violet/30 to-fuchsia-500/10",
};

const fireCelebration = () => {
  const colors = ["#FF007F", "#FFFFFF", "#FFD700"];
  // Burst from both sides
  const fire = (originX: number) => {
    confetti({
      particleCount: 80,
      angle: originX < 0.5 ? 60 : 120,
      spread: 70,
      origin: { x: originX, y: 0.7 },
      colors,
      scalar: 1.1,
    });
  };
  fire(0.1); fire(0.9);
  setTimeout(() => { fire(0.2); fire(0.8); }, 250);
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 160,
      origin: { y: 0.5 },
      colors,
      startVelocity: 45,
    });
  }, 500);
};

const Learn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [active, setActive] = useState<Lesson | null>(null);
  const [examLevel, setExamLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [lRes, pRes, aRes] = await Promise.all([
        supabase.from("lessons").select("*").order("level").order("order_index"),
        user ? supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
        user ? supabase.from("quiz_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      ]);
      setLessons((lRes.data as Lesson[]) || []);
      const pm: Record<string, boolean> = {};
      (pRes.data || []).forEach((p: any) => (pm[p.lesson_id] = p.completed));
      setProgress(pm);
      setAttempts((aRes.data as QuizAttempt[]) || []);
      setLoading(false);
    })();
  }, [user]);

  // Per-level lesson lists ordered
  const lessonsByLevel = useMemo(() => {
    const m: Record<Level, Lesson[]> = { beginner: [], intermediate: [], advanced: [] };
    lessons.forEach((l) => m[l.level]?.push(l));
    return m;
  }, [lessons]);

  // Level pass = exists an attempt with passed=true for that level
  const levelPassed = (lvl: Level) => attempts.some((a) => a.level === lvl && a.passed);
  const isLevelUnlocked = (lvl: Level): boolean => {
    if (lvl === "beginner") return true;
    if (lvl === "intermediate") return levelPassed("beginner");
    return levelPassed("intermediate");
  };

  // Lesson unlock: first lesson always; subsequent only if previous lesson completed
  const lessonUnlocked = (lvl: Level, idx: number): boolean => {
    if (!isLevelUnlocked(lvl)) return false;
    if (idx === 0) return true;
    const prev = lessonsByLevel[lvl][idx - 1];
    return !!progress[prev?.id];
  };

  const allLessonsDone = (lvl: Level) => {
    const arr = lessonsByLevel[lvl];
    return arr.length > 0 && arr.every((l) => progress[l.id]);
  };

  const openLesson = async (lesson: Lesson) => {
    setActive(lesson);
    if (!user) return;
    await supabase.from("lesson_progress").upsert(
      { user_id: user.id, lesson_id: lesson.id, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
  };

  const markComplete = async (lesson: Lesson) => {
    if (!user) return;
    await supabase.from("lesson_progress").upsert(
      { user_id: user.id, lesson_id: lesson.id, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
    setProgress((p) => ({ ...p, [lesson.id]: true }));
    // Auto next
    const arr = lessonsByLevel[lesson.level];
    const idx = arr.findIndex((l) => l.id === lesson.id);
    const next = arr[idx + 1];
    if (next) setActive(next);
    else {
      toast({ title: "🎉 Бүх хичээл дууссан!", description: "Одоо шалгалт өгөөрэй." });
      setActive(null);
    }
  };

  // ===== EXAM VIEW =====
  if (examLevel) {
    return (
      <ExamView
        level={examLevel}
        lessons={lessonsByLevel[examLevel]}
        onClose={(refreshAttempts) => {
          setExamLevel(null);
          if (refreshAttempts && user) {
            supabase.from("quiz_attempts").select("*").eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .then(({ data }) => setAttempts((data as QuizAttempt[]) || []));
          }
        }}
        onLessonReview={(lesson) => { setExamLevel(null); setActive(lesson); }}
      />
    );
  }

  // ===== LESSON VIEW =====
  if (active) {
    const arr = lessonsByLevel[active.level];
    const idx = arr.findIndex((l) => l.id === active.id);
    const nextLesson = arr[idx + 1];
    return (
      <PageShell title={active.title}>
        <div className="max-w-3xl mx-auto p-4 md:p-8 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Жагсаалт
          </Button>
          <Card className="p-6 md:p-8 bg-card/70 backdrop-blur-xl border-border/50 animate-elastic">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={cn(LEVEL_BADGE[active.level])} variant="outline">
                {LEVEL_LABEL[active.level]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Хичээл {idx + 1} / {arr.length}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{active.title}</h1>
            <p className="text-muted-foreground text-sm mb-6">{active.description}</p>
            <article className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary prose-li:text-foreground/90 prose-code:text-info prose-code:bg-secondary prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{active.content}</ReactMarkdown>
            </article>
            <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap justify-between items-center gap-3">
              {progress[active.id] ? (
                <Badge className="bg-bull/15 text-bull border-bull/40" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Дууссан
                </Badge>
              ) : <span />}
              <div className="flex gap-2 ml-auto">
                {!progress[active.id] && (
                  <Button onClick={() => markComplete(active)} className="bg-gradient-to-r from-primary to-accent btn-luxury">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Дуусгах
                  </Button>
                )}
                {nextLesson && (
                  <Button
                    variant="outline"
                    onClick={() => setActive(nextLesson)}
                    disabled={!progress[active.id]}
                    className="border-primary/40"
                  >
                    Дараагийн <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  // ===== LIST VIEW =====
  return (
    <PageShell title="Сургалт">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
        <div className="animate-slide-in-bottom">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Forex Mastery
          </h2>
          <p className="text-muted-foreground text-sm">
            Хичээл бүрийг дараалан үзэж, түвшний эцэст 26 асуултын <span className="text-primary font-semibold">100%</span> шалгалт өгч дараагийн түвшинд гар.
          </p>
        </div>

        {loading && <p className="text-muted-foreground">Уншиж байна...</p>}

        {LEVELS.map((lvl, lvlIdx) => {
          const items = lessonsByLevel[lvl];
          if (items.length === 0) return null;
          const unlocked = isLevelUnlocked(lvl);
          const passed = levelPassed(lvl);
          const done = items.filter((l) => progress[l.id]).length;
          const allDone = allLessonsDone(lvl);
          const lastAttempt = attempts.find((a) => a.level === lvl);
          return (
            <section key={lvl} className={cn("animate-fade-up", `stagger-${lvlIdx + 1}`)}>
              <Card className={cn(
                "p-4 md:p-6 border-border/50 bg-gradient-to-br backdrop-blur-xl",
                LEVEL_GRADIENT[lvl],
                !unlocked && "opacity-60",
              )}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border",
                      LEVEL_BADGE[lvl],
                    )}>
                      {!unlocked ? <Lock className="w-5 h-5" /> :
                        passed ? <Trophy className="w-5 h-5" /> :
                        <GraduationCap className="w-5 h-5" />}
                    </div>
                    <div>
                      <Badge className={LEVEL_BADGE[lvl]} variant="outline">
                        {LEVEL_LABEL[lvl]}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{LEVEL_DESC[lvl]}</p>
                    </div>
                  </div>
                  {passed && (
                    <Badge className="bg-gold/15 text-gold border-gold/40" variant="outline">
                      <Trophy className="w-3 h-3 mr-1" /> 100% Mastery
                    </Badge>
                  )}
                </div>

                {unlocked && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-semibold">{done}/{items.length}</span>
                    </div>
                    <Progress value={(done / items.length) * 100} className="h-2" />
                  </div>
                )}

                {!unlocked ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                    <Lock className="w-3.5 h-3.5" />
                    Өмнөх түвшний шалгалтыг 100% өгч нээгдэнэ.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((l, i) => {
                      const lUnlocked = lessonUnlocked(lvl, i);
                      const lDone = !!progress[l.id];
                      return (
                        <button
                          key={l.id}
                          onClick={() => lUnlocked && openLesson(l)}
                          disabled={!lUnlocked}
                          className={cn(
                            "text-left transition-all",
                            !lUnlocked && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <Card className={cn(
                            "p-4 h-full bg-card/70 border-border/50 transition-all",
                            lUnlocked && "hover:border-primary/50 hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] hover:-translate-y-0.5",
                          )}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                                {lUnlocked ? <BookOpen className="w-4 h-4 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                              </div>
                              {lDone ? (
                                <CheckCircle2 className="w-4 h-4 text-bull" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{l.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                          </Card>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Exam button */}
                {unlocked && (
                  <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {lastAttempt ? (
                        <>Сүүлийн оролдлого: <span className={cn("font-bold", lastAttempt.passed ? "text-bull" : "text-bear")}>{lastAttempt.score}/{lastAttempt.total}</span></>
                      ) : (
                        "Шалгалтыг бүх хичээл үзсэний дараа өгнө."
                      )}
                    </div>
                    <Button
                      onClick={() => setExamLevel(lvl)}
                      disabled={!allDone}
                      className={cn(
                        "btn-luxury",
                        passed
                          ? "bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30"
                          : "bg-gradient-to-r from-primary to-accent",
                      )}
                    >
                      {passed ? <><RotateCcw className="w-4 h-4 mr-2" /> Дахин өгөх</> : <><Sparkles className="w-4 h-4 mr-2" /> Шалгалт өгөх (26 асуулт)</>}
                    </Button>
                  </div>
                )}
              </Card>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
};

// ===================== EXAM VIEW =====================
interface ExamViewProps {
  level: Level;
  lessons: Lesson[];
  onClose: (refresh: boolean) => void;
  onLessonReview: (l: Lesson) => void;
}
const ExamView = ({ level, lessons, onClose, onLessonReview }: ExamViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; wrongIds: string[] } | null>(null);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("level", level)
      .order("order_index");
    setQuestions((data as QuizQuestion[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("level", level)
        .order("order_index");
      if (data && data.length > 0) {
        setQuestions(data as QuizQuestion[]);
        setLoading(false);
      } else {
        setGenerating(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-quiz`;
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ level }),
          });
          const j = await resp.json();
          if (!resp.ok) {
            toast({ title: "Алдаа", description: j.error || "Шалгалт үүсгэж чадсангүй", variant: "destructive" });
            setLoading(false);
            return;
          }
        } catch (e: any) {
          toast({ title: "Алдаа", description: e.message, variant: "destructive" });
        } finally {
          setGenerating(false);
        }
        await fetchQuestions();
      }
    })();
  }, [level]);

  const finalize = async (allAnswers: Record<string, number>) => {
    let score = 0;
    const wrongLessons: string[] = [];
    for (const q of questions) {
      if (allAnswers[q.id] === q.correct_index) score++;
      else if (q.lesson_id) wrongLessons.push(q.lesson_id);
    }
    const passed = score === questions.length;
    setResult({ score, total: questions.length, passed, wrongIds: [...new Set(wrongLessons)] });
    setSubmitted(true);
    if (passed) fireCelebration();
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id, level, score, total: questions.length, passed,
        wrong_lesson_ids: [...new Set(wrongLessons)],
      });
    }
  };

  const handleNext = () => {
    if (selected === null) return;
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);

    if (!revealed) {
      setRevealed(true);
      return;
    }
    // move forward
    if (currentIdx + 1 >= questions.length) {
      finalize(newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setCurrentIdx(0);
    setSelected(null);
    setRevealed(false);
  };

  if (loading || generating) {
    return (
      <PageShell title="Шалгалт">
        <div className="max-w-2xl mx-auto p-8 flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {generating ? "AI шалгалт үүсгэж байна... (~10 секунд)" : "Уншиж байна..."}
          </p>
        </div>
      </PageShell>
    );
  }

  if (questions.length === 0) {
    return (
      <PageShell title="Шалгалт">
        <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-bear" />
          <p>Асуулт олдсонгүй.</p>
          <Button onClick={() => onClose(false)}>Буцах</Button>
        </div>
      </PageShell>
    );
  }

  // Result screen
  if (submitted && result) {
    const wrongLessonsObjs = lessons.filter((l) => result.wrongIds.includes(l.id));
    const wrongQuestions = questions.filter((q) => answers[q.id] !== q.correct_index);
    return (
      <PageShell title="Үр дүн">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
          <Card className={cn(
            "p-8 text-center bg-card/70 backdrop-blur-xl animate-elastic border-2 relative overflow-hidden",
            result.passed ? "border-gold/60 shadow-[0_0_60px_hsl(var(--gold)/0.3)]" : "border-bear/40",
          )}>
            <div className={cn(
              "absolute inset-0 opacity-30",
              result.passed ? "bg-gradient-to-br from-gold/30 via-primary/20 to-transparent" : "bg-gradient-to-br from-bear/20 to-transparent",
            )} />
            <div className="relative">
              {result.passed ? (
                <>
                  <Trophy className="w-20 h-20 mx-auto text-gold mb-4 animate-glow-pulse" />
                  <h2 className="text-4xl font-bold mb-2 text-shimmer">100% Mastery!</h2>
                  <p className="text-muted-foreground mb-3">{LEVEL_LABEL[level]} түвшнийг бүрэн эзэмшсэн.</p>
                  <div className="text-5xl font-black text-bull mb-2">{result.score} / {result.total}</div>
                  <p className="text-sm text-muted-foreground">Дараагийн түвшин нээгдлээ! 🎉</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-20 h-20 mx-auto text-bear mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Дахин оролдоорой</h2>
                  <div className="text-5xl font-black text-bear mb-2">{result.score} / {result.total}</div>
                  <p className="text-sm text-muted-foreground">Зөвхөн <span className="text-primary font-semibold">100%</span> авч дараагийн түвшинд гарна.</p>
                </>
              )}
            </div>
          </Card>

          {wrongQuestions.length > 0 && (
            <Card className="p-5 bg-card/70 border-bear/40 animate-fade-up">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-bear">
                <AlertCircle className="w-4 h-4" /> Алдсан асуултууд ({wrongQuestions.length})
              </h3>
              <div className="space-y-3">
                {wrongQuestions.map((q, qi) => (
                  <div key={q.id} className="p-3 rounded-lg border border-border/40 bg-background/40">
                    <p className="text-sm font-medium mb-2">{qi + 1}. {q.question}</p>
                    <p className="text-xs text-bear mb-1">
                      <span className="font-semibold">Таны хариу:</span> {q.options[answers[q.id]] ?? "—"}
                    </p>
                    <p className="text-xs text-bull mb-2">
                      <span className="font-semibold">Зөв хариу:</span> {q.options[q.correct_index]}
                    </p>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground italic">{q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!result.passed && wrongLessonsObjs.length > 0 && (
            <Card className="p-5 bg-card/70 border-info/40 animate-fade-up">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-info">
                <BookOpen className="w-4 h-4" /> Review Guide — Эдгээр хичээлийг дахин үз:
              </h3>
              <div className="space-y-2">
                {wrongLessonsObjs.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onLessonReview(l)}
                    className="w-full text-left p-3 rounded-lg border border-border/40 hover:border-info/60 hover:bg-info/5 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-sm">{l.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{l.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-info transition-colors" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => onClose(true)}>Жагсаалт руу</Button>
            {!result.passed && (
              <Button onClick={reset} className="bg-gradient-to-r from-primary to-accent btn-luxury">
                <RotateCcw className="w-4 h-4 mr-2" /> Дахин өгөх
              </Button>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // ===== ONE QUESTION AT A TIME =====
  const q = questions[currentIdx];
  const isCorrect = revealed && selected === q.correct_index;
  const isWrong = revealed && selected !== q.correct_index;

  return (
    <PageShell title="Шалгалт">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => onClose(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Гарах
          </Button>
          <Badge className={LEVEL_BADGE[level]} variant="outline">{LEVEL_LABEL[level]}</Badge>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Асуулт {currentIdx + 1} / {questions.length}</span>
            <span className="font-semibold text-primary">{Math.round(((currentIdx + (revealed ? 1 : 0)) / questions.length) * 100)}%</span>
          </div>
          <Progress value={((currentIdx + (revealed ? 1 : 0)) / questions.length) * 100} className="h-1.5" />
        </div>

        <Card key={q.id} className="p-6 bg-card/70 border-border/50 animate-elastic">
          <p className="font-semibold text-base md:text-lg mb-5 leading-relaxed">{q.question}</p>
          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const isSelected = selected === oi;
              const isCorrectAnswer = oi === q.correct_index;
              let style = "border-border/40 hover:border-primary/40 hover:bg-secondary/40";
              if (revealed) {
                if (isCorrectAnswer) style = "border-bull bg-bull/15 text-bull";
                else if (isSelected) style = "border-bear bg-bear/15 text-bear";
                else style = "border-border/30 opacity-60";
              } else if (isSelected) {
                style = "border-primary bg-primary/10 shadow-[0_0_14px_hsl(var(--primary)/0.4)]";
              }
              return (
                <button
                  key={oi}
                  onClick={() => !revealed && setSelected(oi)}
                  disabled={revealed}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all text-sm flex items-center gap-3",
                    style,
                  )}
                >
                  <span className="inline-flex w-7 h-7 rounded-full border border-current items-center justify-center text-xs font-bold shrink-0">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-bull shrink-0" />}
                  {revealed && isSelected && !isCorrectAnswer && <AlertCircle className="w-5 h-5 text-bear shrink-0" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className={cn(
              "mt-5 p-4 rounded-lg border animate-fade-in",
              isCorrect ? "bg-bull/10 border-bull/40" : "bg-bear/10 border-bear/40",
            )}>
              <p className={cn("text-sm font-bold mb-1", isCorrect ? "text-bull" : "text-bear")}>
                {isCorrect ? "✓ Зөв хариулт" : "✗ Буруу — алдсаныг тэмдэглэлээ"}
              </p>
              {q.explanation && (
                <p className="text-xs text-foreground/80 leading-relaxed">{q.explanation}</p>
              )}
            </div>
          )}
        </Card>

        <Button
          onClick={handleNext}
          disabled={selected === null}
          className="w-full bg-gradient-to-r from-primary to-accent btn-luxury h-12 text-base"
        >
          {!revealed
            ? <>Шалгах <Sparkles className="w-4 h-4 ml-2" /></>
            : currentIdx + 1 >= questions.length
              ? <>Үр дүн харах <Trophy className="w-4 h-4 ml-2" /></>
              : <>Дараагийн асуулт <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </PageShell>
  );
};

export default Learn;
