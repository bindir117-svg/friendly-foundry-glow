import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, BookOpen, Lock, PlayCircle, 
  ChevronRight, AlertCircle, Trophy, GraduationCap, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { toast } from "sonner";

// Шалгалтын асуултууд хэвээрээ байна...
const QUIZ_QUESTIONS = { /* ... өмнөх асуултууд ... */ };

const Learn = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [quizLevel, setQuizLevel] = useState<string | null>(null);
  const [examResults, setExamResults] = useState<Record<string, number>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchLessons();
    const savedProgress = localStorage.getItem("forex_progress");
    const savedExams = localStorage.getItem("exam_results");
    if (savedProgress) setCompletedLessons(JSON.parse(savedProgress));
    if (savedExams) setExamResults(JSON.parse(savedExams));
  }, []);

  const fetchLessons = async () => {
    const { data } = await supabase.from("lessons").select("*").order("order_index", { ascending: true });
    if (data) setLessons(data);
  };

  const fireSuccessConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const isLevelUnlocked = (level: string) => {
    if (level === 'beginner') return true;
    if (level === 'intermediate') return examResults['beginner'] === 100;
    if (level === 'advanced') return examResults['intermediate'] === 100;
    return false;
  };

  return (
    <PageShell>
      {/* Background Effect */}
      <div className="fixed inset-0 bg-[#020617] -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl shadow-lg shadow-sky-500/20">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Forex Intelligence</h1>
              <p className="text-slate-500 font-bold text-xs tracking-[0.4em] uppercase">Professional Trading Academy</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
             <div className="px-6 py-2">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Overall Rank</p>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-white font-black">ELITE TRADER</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar - Interactive & Modern */}
          <div className="lg:col-span-3 space-y-6">
            {['beginner', 'intermediate', 'advanced'].map((lvl) => (
              <Card key={lvl} className={`overflow-hidden border-none bg-slate-900/40 backdrop-blur-2xl transition-all duration-500 group ${!isLevelUnlocked(lvl) ? 'opacity-20 grayscale' : 'hover:bg-slate-900/60 ring-1 ring-white/10'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[11px] font-black uppercase tracking-widest text-sky-400">{lvl}</span>
                    {!isLevelUnlocked(lvl) ? <Lock className="w-4 h-4 text-slate-700" /> : <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
                  </div>
                  <div className="space-y-2">
                    {lessons.filter(l => l.level === lvl).map(l => (
                      <button 
                        key={l.id}
                        disabled={!isLevelUnlocked(lvl)}
                        onClick={() => setActiveLesson(l)}
                        className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group/btn ${activeLesson?.id === l.id ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <span className="text-sm font-bold truncate pr-4">{l.title}</span>
                        {completedLessons.includes(l.id) ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <PlayCircle className="w-5 h-5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Main Content Area - Cinematic Feel */}
          <div className="lg:col-span-9">
            {activeLesson ? (
              <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                <Card className="p-16 bg-slate-900/40 border-none ring-1 ring-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5">
                    <BookOpen className="w-64 h-64" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="h-[2px] w-12 bg-sky-500" />
                      <span className="text-sky-500 text-xs font-black uppercase tracking-[0.3em]">{activeLesson.level} module</span>
                    </div>
                    
                    <h2 className="text-6xl font-black text-white mb-12 tracking-tighter leading-none">{activeLesson.title}</h2>
                    
                    <div className="prose prose-invert prose-sky max-w-none mb-16 text-slate-300 text-xl leading-relaxed font-medium">
                      <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
                    </div>

                    <div className="flex justify-between items-center pt-10 border-t border-white/5">
                      <div className="text-slate-500 italic font-medium">Professional Forex Course v2.0</div>
                      <Button size="lg" className="bg-sky-600 hover:bg-sky-500 text-white px-10 h-16 rounded-2xl font-black text-lg shadow-xl shadow-sky-900/40" onClick={() => {/* handle complete */}}>
                        MARK AS COMPLETE <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="h-[700px] flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                <div className="relative">
                   <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full animate-pulse" />
                   <BookOpen className="w-24 h-24 text-slate-700 relative z-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-500 uppercase tracking-tighter mt-8">Select a Module to Start</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Learn;