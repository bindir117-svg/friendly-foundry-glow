import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Image as ImageIcon, Save, X, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  image_urls: string[];
  bg_color: string;
  created_at: string;
  updated_at: string;
}

const PRESET_COLORS = [
  { name: "Ягаан", value: "#ec4899" },
  { name: "Цэнхэр", value: "#3b82f6" },
  { name: "Ногоон", value: "#10b981" },
  { name: "Шар", value: "#f59e0b" },
  { name: "Ягаан-Нил", value: "#a855f7" },
];

const Notes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [bgColor, setBgColor] = useState<string>(PRESET_COLORS[0].value);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const startNew = () => {
    setActive(null);
    setTitle("");
    setContent("");
    setImages([]);
    setBgColor(PRESET_COLORS[0].value);
    setCreating(true);
  };

  const openNote = (n: Note) => {
    setActive(n);
    setTitle(n.title);
    setContent(n.content);
    setImages(n.image_urls || []);
    setBgColor(n.bg_color || PRESET_COLORS[0].value);
    setCreating(true);
  };

  const closeEditor = () => {
    setCreating(false);
    setActive(null);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Файл хэт том (5MB-аас бага)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("note-attachments").upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = await supabase.storage.from("note-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) setImages((p) => [...p, data.signedUrl]);
    } catch (err: any) {
      toast({ title: "Алдаа", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    const t = title.trim() || "Тэмдэглэл";
    const payload = { title: t, content, image_urls: images, bg_color: bgColor };
    if (active) {
      const { error } = await supabase.from("notes").update(payload).eq("id", active.id);
      if (error) { toast({ title: "Хадгалж чадсангүй", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("notes").insert({ user_id: user.id, ...payload });
      if (error) { toast({ title: "Хадгалж чадсангүй", variant: "destructive" }); return; }
    }
    toast({ title: "Хадгалагдлаа" });
    closeEditor();
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    load();
  };

  return (
    <PageShell title="Тэмдэглэл">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Өдрийн тэмдэглэл
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Journal — өнгө, зураг, бүгд таны мэдэлд.</p>
          </div>
          {!creating && (
            <Button onClick={startNew} className="bg-gradient-to-r from-primary to-accent btn-luxury">
              <Plus className="w-4 h-4 mr-2" /> Шинэ
            </Button>
          )}
        </div>

        {creating && (
          <Card
            className="p-4 md:p-6 border-2 space-y-4 animate-elastic transition-colors bg-card"
            style={{ borderColor: bgColor }}
          >
            <div className="flex items-center justify-between">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Гарчиг"
                maxLength={100}
                className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 text-foreground placeholder:text-foreground/40"
              />
              <Button variant="ghost" size="icon" onClick={closeEditor}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Тэмдэглэлээ бичнэ үү..."
              rows={8}
              className="resize-none bg-background/30 border-foreground/10"
            />

            {/* Color picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <Palette className="w-3.5 h-3.5" /> Дэвсгэр өнгө
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBgColor(c.value)}
                    title={c.name}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                      bgColor === c.value ? "border-primary shadow-[0_0_14px_hsl(var(--primary)/0.7)] scale-110" : "border-foreground/20",
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group animate-fade-in">
                    <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {uploading ? "Уншиж байна..." : "Зураг нэмэх"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
              <Button onClick={save} className="ml-auto bg-gradient-to-r from-primary to-accent btn-luxury">
                <Save className="w-4 h-4 mr-2" /> Хадгалах
              </Button>
            </div>
          </Card>
        )}

        {notes.length === 0 && !creating && (
          <p className="text-muted-foreground text-center py-12 text-sm animate-fade-in">
            Тэмдэглэл алга. "Шинэ" дараарай.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n, i) => (
            <button
              key={n.id}
              onClick={() => openNote(n)}
              className="group relative text-white rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both", backgroundColor: n.bg_color || PRESET_COLORS[0].value }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm line-clamp-2 flex-1 drop-shadow">{n.title}</h3>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); remove(n.id); }}
                  className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="relative text-[10px] text-white/80 mt-2">
                {format(new Date(n.updated_at), "MM-dd HH:mm")}
              </p>
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Notes;
