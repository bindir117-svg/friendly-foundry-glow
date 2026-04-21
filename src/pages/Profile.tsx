import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, Mail, Calendar, MessageSquare, BookOpen, StickyNote, Image as ImageIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Stats {
  chats: number;
  notes: number;
  lessons: number;
  images: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<Stats>({ chats: 0, notes: 0, lessons: 0, images: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setEmail(data.email || user.email || "");
        setAvatarUrl(data.avatar_url || null);
        setCreatedAt(data.created_at);
      }

      // Stats
      const [chatsRes, notesRes, lessonsRes, imagesRes] = await Promise.all([
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({
        chats: chatsRes.count || 0,
        notes: notesRes.count || 0,
        lessons: lessonsRes.count || 0,
        images: imagesRes.count || 0,
      });
    })();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Файл хэт том байна (5MB-аас бага байх)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast({ title: "Профайл зураг шинэчлэгдлээ" });
    } catch (err: any) {
      toast({ title: "Алдаа гарлаа", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Хадгалж чадсангүй", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Хадгалагдлаа" });
    }
  };

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <PageShell title="Профайл">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Avatar + name */}
        <Card className="p-6 bg-card/70 backdrop-blur-xl border-border/50 animate-elastic relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="relative animate-glow-pulse rounded-full">
              <Avatar className="w-28 h-28 ring-2 ring-primary/50 shadow-[0_0_40px_hsl(var(--primary)/0.5)]">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 btn-luxury"
                aria-label="Зураг солих"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 w-full space-y-3">
              <div>
                <Label htmlFor="dn" className="text-xs text-muted-foreground">Нэр</Label>
                <Input
                  id="dn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Таны нэр"
                  maxLength={50}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent btn-luxury">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
            </div>
          </div>

          <div className="relative mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 text-info" />
              <span>{email}</span>
            </div>
            {createdAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-violet" />
                <span>Бүртгүүлсэн: {format(new Date(createdAt), "yyyy-MM-dd")}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={MessageSquare} label="Яриа" value={stats.chats} color="text-primary" delay={0} />
          <StatCard icon={BookOpen} label="Үзсэн хичээл" value={stats.lessons} color="text-bull" delay={50} />
          <StatCard icon={StickyNote} label="Тэмдэглэл" value={stats.notes} color="text-info" delay={100} />
          <StatCard icon={ImageIcon} label="AI зураг" value={stats.images} color="text-violet" delay={150} />
        </div>

        {/* Logout */}
        <Card className="p-4 bg-card/70 backdrop-blur-xl border-border/50 animate-fade-up">
          <Button
            variant="outline"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="w-full border-bear/40 text-bear hover:bg-bear/10 hover:text-bear"
          >
            <LogOut className="w-4 h-4 mr-2" /> Гарах
          </Button>
        </Card>
      </div>
    </PageShell>
  );
};

const StatCard = ({ icon: Icon, label, value, color, delay }: { icon: any; label: string; value: number; color: string; delay: number }) => (
  <Card
    className="p-4 bg-card/70 backdrop-blur-xl border-border/50 hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] animate-fade-up"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <Icon className={`w-5 h-5 mb-2 ${color}`} />
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </Card>
);

export default Profile;
