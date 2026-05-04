import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface HistoryItem {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

const PRESETS = [
  "EURUSD H4 chart дээр bullish engulfing pattern, candlesticks",
  "Forex trader арилжаа хийж буй, олон monitor, neon-pink гэрэл",
  "Smart Money Concept схем — Order Block, FVG, BOS",
  "Сэтгэл хөдлөлгүй сахилгатай trader-ийн зураг",
];

const Design = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("generated_images")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as HistoryItem[]) || []);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-image`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      let data: any = {};
      try { data = await resp.json(); } catch { /* ignore */ }
      if (!resp.ok) {
        toast({
          title: `Алдаа (${resp.status})`,
          description: data?.error || "Зураг үүсгэж чадсангүй. Дахин оролдоно уу.",
          variant: "destructive",
        });
        return;
      }
      if (!data.imageUrl) {
        toast({ title: "Алдаа", description: "Зураг ирсэнгүй.", variant: "destructive" });
        return;
      }
      setResult(data.imageUrl);
      loadHistory();
    } catch (e: any) {
      toast({ title: "Сүлжээний алдаа", description: e.message || "Холболт амжилтгүй", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const download = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `mndrin-${Date.now()}.png`;
    a.click();
  };

  return (
    <PageShell title="AI Дизайн">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Зураг үүсгэх
          </h2>
          <p className="text-muted-foreground text-sm">
            Юу үүсгүүлэхээ бичээрэй — Forex график, illustration, концепт зураг гэх мэт.
          </p>
        </div>

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur-xl border-border/50">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Жишээ: Bullish engulfing pattern дээр trader entry хийж буй cinematic зураг..."
            rows={4}
            maxLength={1000}
            className="resize-none mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {p.slice(0, 30)}...
              </button>
            ))}
          </div>
          <Button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Үүсгэж байна...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Зураг үүсгэх</>
            )}
          </Button>
        </Card>

        {result && (
          <Card className="p-4 bg-card/60 backdrop-blur-xl border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
            <img src={result} alt="Generated" className="w-full rounded-lg" />
            <Button onClick={() => download(result)} variant="outline" size="sm" className="mt-3">
              <Download className="w-4 h-4 mr-2" /> Татаж авах
            </Button>
          </Card>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Түүх</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {history.map((h) => (
                <Card key={h.id} className="p-2 bg-card/60 backdrop-blur-xl border-border/50 group cursor-pointer" onClick={() => setResult(h.image_url)}>
                  <img src={h.image_url} alt={h.prompt} className="w-full aspect-square object-cover rounded" />
                  <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{h.prompt}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Design;
