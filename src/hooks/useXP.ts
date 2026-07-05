import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export interface XPState {
  xp: number;
  level: number;
  streak_days: number;
}

export const XP_PER_LEVEL = 100;

export function useXP() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<XPState>({ xp: 0, level: 1, streak_days: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("xp, level, streak_days")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setState({ xp: data.xp ?? 0, level: data.level ?? 1, streak_days: data.streak_days ?? 0 });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const award = useCallback(async (amount: number, reason?: string) => {
    if (!user || amount <= 0) return;
    const { data, error } = await supabase.rpc("award_xp", { _user_id: user.id, _amount: amount });
    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    setState((s) => ({ ...s, xp: row.new_xp, level: row.new_level }));
    toast({
      title: `+${amount} XP`,
      description: reason || "Сайн байна!",
    });
    if (row.leveled_up) {
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 }, colors: ["#FFD700", "#FF007F", "#ffffff"] });
      toast({ title: `⭐ Level ${row.new_level}!`, description: "Шинэ түвшинд гарлаа!" });
    }
  }, [user, toast]);

  return { ...state, loading, refresh, award };
}
