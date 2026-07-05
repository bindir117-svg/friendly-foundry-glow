import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb, AlertTriangle, Info, Sparkles, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useXP } from "@/hooks/useXP";
import confetti from "canvas-confetti";

/* ---------- QUIZ ---------- */
export function QuizBlock({ q, options, answer, explain, xp = 5 }: {
  q: string; options: string[]; answer: number; explain?: string; xp?: number;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [awarded, setAwarded] = useState(false);
  const { award } = useXP();

  const choose = async (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === answer && !awarded) {
      setAwarded(true);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 }, colors: ["#22c55e", "#FFD700"] });
      await award(xp, "Quiz зөв хариулт");
    }
  };

  return (
    <div className="my-8 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5 p-5 not-prose">
      <div className="flex items-center gap-2 mb-3 text-primary">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Quiz · +{xp} XP</span>
      </div>
      <p className="font-semibold text-base mb-4 text-foreground">{q}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === answer;
          const revealed = picked !== null;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all flex items-center justify-between gap-3",
                !revealed && "border-border/50 hover:border-primary/60 hover:bg-primary/5",
                revealed && isCorrect && "border-bull bg-bull/15 text-bull",
                revealed && isPicked && !isCorrect && "border-destructive bg-destructive/15 text-destructive",
                revealed && !isPicked && !isCorrect && "border-border/30 opacity-50",
              )}
            >
              <span>{opt}</span>
              {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 flex-none" />}
              {revealed && isPicked && !isCorrect && <XCircle className="w-4 h-4 flex-none" />}
            </button>
          );
        })}
      </div>
      {picked !== null && explain && (
        <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-xs text-foreground/90 flex gap-2">
          <Lightbulb className="w-4 h-4 text-accent flex-none mt-0.5" />
          <span>{explain}</span>
        </div>
      )}
      {picked !== null && picked !== answer && (
        <button
          onClick={() => setPicked(null)}
          className="mt-3 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" /> Дахин
        </button>
      )}
    </div>
  );
}

/* ---------- FLASHCARD ---------- */
export function FlashcardBlock({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className="my-8 w-full not-prose text-left group"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative w-full min-h-[160px] transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <div
          className="absolute inset-0 rounded-2xl border-2 border-accent/50 bg-gradient-to-br from-accent/15 to-accent/5 p-6 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Асуулт · дар</span>
          <p className="text-center text-base font-semibold text-foreground">{front}</p>
        </div>
        <div
          className="absolute inset-0 rounded-2xl border-2 border-bull/50 bg-gradient-to-br from-bull/15 to-bull/5 p-6 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-bull mb-2">Хариулт</span>
          <p className="text-center text-base text-foreground">{back}</p>
        </div>
      </div>
    </button>
  );
}

/* ---------- FILL BLANK ---------- */
export function FillBlock({ prompt, answer, xp = 3 }: { prompt: string; answer: string; xp?: number }) {
  const [val, setVal] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [awarded, setAwarded] = useState(false);
  const { award } = useXP();

  const check = async () => {
    const ok = val.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(ok ? "ok" : "fail");
    if (ok && !awarded) { setAwarded(true); await award(xp, "Зөв нөхлөө"); }
  };

  return (
    <div className="my-8 rounded-2xl border-2 border-info/40 bg-info/5 p-5 not-prose">
      <div className="flex items-center gap-2 mb-3 text-info">
        <Lightbulb className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Нөх · +{xp} XP</span>
      </div>
      <p className="text-sm mb-3 text-foreground">{prompt}</p>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => { setVal(e.target.value); setStatus("idle"); }}
          onKeyDown={(e) => e.key === "Enter" && check()}
          className={cn(
            "flex-1 px-3 py-2 rounded-lg bg-background border-2 text-sm outline-none transition-colors",
            status === "idle" && "border-border/60 focus:border-info",
            status === "ok" && "border-bull",
            status === "fail" && "border-destructive",
          )}
          placeholder="Хариулт..."
        />
        <button
          onClick={check}
          className="px-4 py-2 rounded-lg bg-info text-info-foreground text-sm font-semibold hover:brightness-110"
        >
          Шалгах
        </button>
      </div>
      {status === "ok" && (
        <p className="mt-2 text-xs text-bull flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Зөв!</p>
      )}
      {status === "fail" && (
        <p className="mt-2 text-xs text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" /> Буруу — дахин оролдоорой</p>
      )}
    </div>
  );
}

/* ---------- CALLOUT ---------- */
export function CalloutBlock({ variant = "tip", title, children }: {
  variant?: "tip" | "warn" | "info" | "success"; title?: string; children: React.ReactNode;
}) {
  const cfg = {
    tip: { icon: Lightbulb, color: "text-accent", border: "border-accent/40", bg: "from-accent/10 to-accent/5", label: "Санамж" },
    warn: { icon: AlertTriangle, color: "text-destructive", border: "border-destructive/40", bg: "from-destructive/10 to-destructive/5", label: "Анхаар" },
    info: { icon: Info, color: "text-info", border: "border-info/40", bg: "from-info/10 to-info/5", label: "Мэдээлэл" },
    success: { icon: CheckCircle2, color: "text-bull", border: "border-bull/40", bg: "from-bull/10 to-bull/5", label: "Онцлох" },
  }[variant];
  const Icon = cfg.icon;
  return (
    <div className={cn("my-6 rounded-2xl border-2 p-4 flex gap-3 bg-gradient-to-br not-prose", cfg.border, cfg.bg)}>
      <Icon className={cn("w-5 h-5 flex-none mt-0.5", cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", cfg.color)}>{title || cfg.label}</p>
        <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
