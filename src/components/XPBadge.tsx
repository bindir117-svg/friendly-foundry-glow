import { Flame, Star } from "lucide-react";
import { useXP, XP_PER_LEVEL } from "@/hooks/useXP";
import { cn } from "@/lib/utils";

export function XPBadge({ compact = false }: { compact?: boolean }) {
  const { xp, level, streak_days, loading } = useXP();
  if (loading) return null;
  const intoLevel = xp % XP_PER_LEVEL;
  const pct = (intoLevel / XP_PER_LEVEL) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40">
          <Star className="w-3 h-3 text-gold" />
          <span className="font-bold">Lv {level}</span>
        </div>
        {streak_days > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/15 border border-orange-500/40 text-orange-400">
            <Flame className="w-3 h-3" />
            <span className="font-bold">{streak_days}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Star className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Түвшин</p>
            <p className="text-lg font-bold leading-none">Lv {level}</p>
          </div>
        </div>
        {streak_days > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-bold">{streak_days}</span>
          </div>
        )}
      </div>
      <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r from-primary to-accent transition-all duration-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">{intoLevel} / {XP_PER_LEVEL} XP · нийт {xp}</p>
    </div>
  );
}
