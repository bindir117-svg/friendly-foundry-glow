import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import LessonMarkdown from "@/components/lesson/LessonMarkdown";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link as LinkIcon, Image as ImageIcon, Eye, Pencil,
  Loader2, Upload, Minus, Table as TableIcon, CheckSquare,
  HelpCircle, Layers, Lightbulb, Type,
} from "lucide-react";

export interface LessonDraft {
  id: string;
  level: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  content: string;
  order_index: number;
  accent_color?: string | null;
  cover_image?: string | null;
}

const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#6366f1",
];

interface Props {
  draft: LessonDraft;
  onChange: (next: LessonDraft) => void;
}

export default function LessonEditor({ draft, onChange }: Props) {
  const { toast } = useToast();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const [uploading, setUploading] = useState(false);

  const accent = draft.accent_color || "#3b82f6";

  const wrap = (before: string, after = before, placeholder = "текст") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = draft.content || "";
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange({ ...draft, content: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  };

  const insertLine = (prefix: string, placeholder = "текст") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = draft.content || "";
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const rest = value.slice(lineStart);
    const sel = ta.selectionEnd > start ? value.slice(start, ta.selectionEnd) : placeholder;
    const newRest = ta.selectionEnd > start ? prefix + sel + rest.slice(sel.length) : prefix + sel + rest;
    onChange({ ...draft, content: before + newRest });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = lineStart + prefix.length + sel.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  };

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta) {
      onChange({ ...draft, content: (draft.content || "") + text });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = draft.content || "";
    onChange({ ...draft, content: value.slice(0, start) + text + value.slice(end) });
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  };

  const uploadImage = async (file: File, asCover = false) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("lesson-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("lesson-images").getPublicUrl(path);
      const url = data.publicUrl;
      if (asCover) {
        onChange({ ...draft, cover_image: url });
      } else {
        insertAtCursor(`\n\n![зураг](${url})\n\n`);
      }
      toast({ title: "Зураг орлоо" });
    } catch (e: any) {
      toast({ title: "Алдаа", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onImagePick = (e: React.ChangeEvent<HTMLInputElement>, asCover = false) => {
    const f = e.target.files?.[0];
    if (f) uploadImage(f, asCover);
    e.target.value = "";
  };

  const Tool = ({ icon: Icon, label, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Meta */}
      <div className="flex gap-2">
        <select
          value={draft.level}
          onChange={(e) => onChange({ ...draft, level: e.target.value as any })}
          className="flex-1 px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-sm"
        >
          <option value="beginner">АНХАН</option>
          <option value="intermediate">ДУНД</option>
          <option value="advanced">АХИСАН</option>
        </select>
        <input
          type="number"
          value={draft.order_index}
          onChange={(e) => onChange({ ...draft, order_index: parseInt(e.target.value) || 0 })}
          placeholder="#"
          className="w-20 px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-sm"
        />
      </div>

      <input
        value={draft.title}
        onChange={(e) => onChange({ ...draft, title: e.target.value })}
        placeholder="Гарчиг"
        className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-sm font-medium"
      />

      <textarea
        value={draft.description}
        onChange={(e) => onChange({ ...draft, description: e.target.value })}
        placeholder="Богино тайлбар"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-sm resize-none"
      />

      {/* Cover + accent color */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/40 bg-secondary/30 p-2 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Нүүр зураг</p>
          {draft.cover_image ? (
            <div className="relative h-24 rounded-md overflow-hidden">
              <img src={draft.cover_image} alt="cover" className="w-full h-full object-cover" />
              <button
                onClick={() => onChange({ ...draft, cover_image: null })}
                className="absolute top-1 right-1 text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded"
              >Устгах</button>
            </div>
          ) : (
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploading}
              className="w-full h-24 rounded-md border-2 border-dashed border-border/60 hover:border-primary/60 flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Зураг оруулах
            </button>
          )}
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => onImagePick(e, true)} />
        </div>

        <div className="rounded-lg border border-border/40 bg-secondary/30 p-2 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Өнгө</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...draft, accent_color: c })}
                className={`h-7 rounded-md border-2 transition-all ${accent === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            value={accent}
            onChange={(e) => onChange({ ...draft, accent_color: e.target.value })}
            className="w-full h-7 rounded-md cursor-pointer bg-transparent border border-border/40"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-border/40 bg-secondary/30 p-1.5 flex items-center gap-0.5 flex-wrap">
        <Tool icon={Heading1} label="H1" onClick={() => insertLine("# ", "Гарчиг")} />
        <Tool icon={Heading2} label="H2" onClick={() => insertLine("## ", "Гарчиг")} />
        <Tool icon={Heading3} label="H3" onClick={() => insertLine("### ", "Гарчиг")} />
        <div className="w-px h-4 bg-border/60 mx-1" />
        <Tool icon={Bold} label="Bold" onClick={() => wrap("**")} />
        <Tool icon={Italic} label="Italic" onClick={() => wrap("*")} />
        <Tool icon={Code} label="Code" onClick={() => wrap("`")} />
        <div className="w-px h-4 bg-border/60 mx-1" />
        <Tool icon={List} label="Bullet list" onClick={() => insertLine("- ", "зүйл")} />
        <Tool icon={ListOrdered} label="Numbered list" onClick={() => insertLine("1. ", "зүйл")} />
        <Tool icon={CheckSquare} label="Checklist" onClick={() => insertLine("- [ ] ", "даалгавар")} />
        <Tool icon={Quote} label="Quote" onClick={() => insertLine("> ", "ишлэл")} />
        <div className="w-px h-4 bg-border/60 mx-1" />
        <Tool icon={LinkIcon} label="Link" onClick={() => {
          const url = prompt("URL:");
          if (url) wrap("[", `](${url})`, "холбоос");
        }} />
        <Tool icon={ImageIcon} label="Зураг upload" onClick={() => fileRef.current?.click()} />
        <Tool icon={TableIcon} label="Хүснэгт" onClick={() =>
          insertAtCursor("\n\n| Гарчиг 1 | Гарчиг 2 |\n|---|---|\n| A | B |\n\n")
        } />
        <Tool icon={Minus} label="Зураас" onClick={() => insertAtCursor("\n\n---\n\n")} />
        <Tool icon={Code} label="Code block" onClick={() => insertAtCursor("\n```\nкод\n```\n")} />
        <div className="ml-auto flex items-center gap-0.5 bg-background/60 rounded-md p-0.5">
          {(["edit", "split", "preview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {m === "edit" ? <Pencil className="w-3 h-3" /> : m === "preview" ? <Eye className="w-3 h-3" /> : "⇆"}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onImagePick(e, false)} />
      </div>

      {/* Editor + preview */}
      <div className={`grid gap-2 ${mode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {mode !== "preview" && (
          <textarea
            ref={taRef}
            value={draft.content}
            onChange={(e) => onChange({ ...draft, content: e.target.value })}
            placeholder="Markdown агуулга..."
            rows={20}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-xs font-mono resize-y min-h-[300px]"
          />
        )}
        {mode !== "edit" && (
          <div
            className="rounded-lg border border-border/40 bg-background p-4 overflow-auto min-h-[300px] prose prose-invert prose-sm max-w-none
              prose-headings:font-bold prose-h2:border-b prose-h2:pb-1 prose-img:rounded-lg
              prose-a:underline prose-code:bg-secondary/60 prose-code:px-1 prose-code:rounded"
            style={{
              ["--tw-prose-headings" as any]: accent,
              ["--tw-prose-links" as any]: accent,
              ["--tw-prose-bold" as any]: accent,
            }}
          >
            {draft.cover_image && (
              <img src={draft.cover_image} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
            )}
            <ReactMarkdown>{draft.content || "_Урьдчилан харах хоосон_"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
