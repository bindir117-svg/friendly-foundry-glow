import { useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const Analyze = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [question, setQuestion] = useState("Энэ графикт юу харагдаж байна вэ? Trend, S/R, боломжит entry/SL/TP?");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Зураг хэт том байна (5MB-аас бага)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageData || !user) return;
    setLoading(true);
    setAnalysis("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/coach-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: question },
                { type: "image_url", image_url: { url: imageData } },
              ],
            },
          ],
        }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        toast({ title: "Алдаа", description: j.error || "Шинжилж чадсангүй", variant: "destructive" });
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              text += delta;
              setAnalysis(text);
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="График шинжилгээ">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            График / Chart шинжилгээ
          </h2>
          <p className="text-muted-foreground text-sm">
            Графикийн screenshot оруулаад AI-аар шинжлүүл — trend, S/R, entry санаа.
          </p>
        </div>

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur-xl border-border/50 space-y-4">
          {!imageData ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border/60 rounded-xl py-12 hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Графикийн зураг сонгох</p>
              <p className="text-xs text-muted-foreground">PNG, JPG (5MB хүртэл)</p>
            </button>
          ) : (
            <div className="relative">
              <img src={imageData} alt="Chart" className="w-full rounded-lg max-h-96 object-contain bg-secondary/40" />
              <Button
                size="icon"
                variant="destructive"
                onClick={() => { setImageData(null); setAnalysis(""); }}
                className="absolute top-2 right-2 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />

          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Юу шинжлүүлэхийг бичнэ үү..."
            rows={2}
            maxLength={500}
            className="resize-none"
          />

          <Button
            onClick={analyze}
            disabled={!imageData || loading}
            className="w-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Шинжилж байна...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> AI-аар шинжлүүлэх</>
            )}
          </Button>
        </Card>

        {analysis && (
          <Card className="p-4 md:p-6 bg-card/60 backdrop-blur-xl border-primary/40">
            <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </article>
          </Card>
        )}
      </div>
    </PageShell>
  );
};

export default Analyze;
