import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Image as ImageIcon, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
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
    setCreating(true);
  };

  const openNote = (n: Note) => {
    setActive(n);
    setTitle(n.title);
    setContent(n.content);
    setImages(n.image_urls || []);
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
    if (active) {
      const { error } = await supabase
        .from("notes")
        .update({ title: t, content, image_urls: images })
        .eq("id", active.id);
      if (error) {
        toast({ title: "Хадгалж чадсангүй", variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: t, content, image_urls: images });
      if (error) {
        toast({ title: "Хадгалж чадсангүй", variant: "destructive" });
        return;
      }
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
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Өдрийн тэмдэглэл
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Арилжааны journal, зураг хавсаргаж болно.</p>
          </div>
          {!creating && (
            <Button onClick={startNew} className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" /> Шинэ
            </Button>
          )}
        </div>

        {creating && (
          <Card className="p-4 md:p-6 bg-card/60 backdrop-blur-xl border-primary/40 space-y-3">
            <div className="flex items-center justify-between">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Гарчиг"
                maxLength={100}
                className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-0"
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
              className="resize-none"
            />

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group">
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

            <div className="flex gap-2">
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
              <Button onClick={save} className="ml-auto bg-gradient-to-r from-primary to-accent">
                <Save className="w-4 h-4 mr-2" /> Хадгалах
              </Button>
            </div>
          </Card>
        )}

        {notes.length === 0 && !creating && (
          <p className="text-muted-foreground text-center py-12 text-sm">
            Тэмдэглэл алга. "Шинэ" дараарай.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <Card
              key={n.id}
              className="p-4 bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => openNote(n)}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-semibold text-sm line-clamp-1">{n.title}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {n.image_urls?.[0] && (
                <img src={n.image_urls[0]} alt="" className="w-full aspect-video object-cover rounded mb-2" />
              )}
              <p className="text-xs text-muted-foreground line-clamp-3">{n.content}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                {format(new Date(n.updated_at), "yyyy-MM-dd HH:mm")}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Notes;
