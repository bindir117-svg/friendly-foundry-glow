import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Бүртгэл амжилттай! Email-ээ нээж баталгаажуулна уу.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Тавтай морилно уу!");
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message || "Алдаа гарлаа";
      if (msg.toLowerCase().includes("invalid login")) {
        toast.error("Email эсвэл нууц үг буруу байна");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        toast.error("Энэ email бүртгэгдсэн байна. Нэвтэрнэ үү.");
        setMode("login");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        toast.error("Email-ээ баталгаажуулаагүй байна. Inbox-оо шалгана уу.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_50px_hsl(var(--primary)/0.6)]" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Star className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
            MNDRIN
          </h1>
        </Link>

        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-[0_0_60px_hsl(var(--primary)/0.15)]">
          <h2 className="text-xl font-bold text-center mb-1">
            {mode === "login" ? "Тавтай морил" : "Бүртгүүлэх"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-6">
            {mode === "login" ? "Email, нууц үгээрээ нэвтэрнэ үү" : "Шинэ бүртгэл үүсгэнэ үү"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Нэр</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Таны нэр"
                  className="bg-secondary/60 border-border/40"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-secondary/60 border-border/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw" className="text-xs">Нууц үг</Label>
              <Input
                id="pw"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/60 border-border/40"
              />
            </div>

            <Button type="submit" disabled={loading} className="btn-luxury w-full rounded-xl mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login" ? "Бүртгэл байхгүй юу? Бүртгүүлэх" : "Бүртгэлтэй юу? Нэвтрэх"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
