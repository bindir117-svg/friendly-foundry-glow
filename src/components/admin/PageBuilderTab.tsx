import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X, Eye, Upload, Loader2, FileText } from "lucide-react";
import { BLOCK_TYPES, BlockRenderer } from "@/components/PageRenderer";
import { cn } from "@/lib/utils";

interface Page { id: string; slug: string; title: string; meta_description: string | null; published: boolean; }
interface Block { id: string; page_id: string; type: string; order_index: number; props: any; }

const DEFAULT_PROPS: Record<string, any> = {
  hero: { eyebrow: "Шинэ", title: "Тавтай морил", subtitle: "Богино тайлбар", cta_label: "Эхлэх", cta_href: "/learn" },
  heading: { level: 2, text: "Гарчиг" },
  text: { text: "Текст энд..." },
  image: { src: "", alt: "", caption: "" },
  cta: { title: "Бэлэн үү?", subtitle: "Дараагийн алхмаа хий", cta_label: "Эхлэх", cta_href: "/learn" },
  feature_grid: { items: [{ icon: "⚡", title: "Хурдан", desc: "Тайлбар" }, { icon: "🎯", title: "Нарийвчлал", desc: "Тайлбар" }, { icon: "🔥", title: "Үр дүн", desc: "Тайлбар" }] },
  stats: { items: [{ value: "100+", label: "Хичээл" }, { value: "24/7", label: "AI" }, { value: "5★", label: "Үнэлгээ" }, { value: "∞", label: "Боломж" }] },
  quote: { text: "Ишлэл...", author: "Хэн нэгэн" },
  divider: {},
  video: { src: "", title: "" },
};

export default function PageBuilderTab() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPages = async () => {
    const { data } = await supabase.from("pages").select("*").order("slug");
    setPages((data as Page[]) || []);
    if (data && data.length && !activePage) setActivePage(data[0] as Page);
  };

  const loadBlocks = async (pageId: string) => {
    const { data } = await supabase
      .from("page_blocks")
      .select("*")
      .eq("page_id", pageId)
      .order("order_index");
    setBlocks((data as Block[]) || []);
  };

  useEffect(() => { loadPages(); }, []);
  useEffect(() => { if (activePage) loadBlocks(activePage.id); }, [activePage?.id]);

  const selected = blocks.find((b) => b.id === selectedBlockId) || null;

  const addBlock = async (type: string) => {
    if (!activePage) return;
    const order = blocks.length;
    const { data, error } = await supabase
      .from("page_blocks")
      .insert({ page_id: activePage.id, type, order_index: order, props: DEFAULT_PROPS[type] || {} })
      .select()
      .single();
    if (error) return toast({ title: "Алдаа", description: error.message, variant: "destructive" });
    setBlocks((b) => [...b, data as Block]);
    setSelectedBlockId((data as Block).id);
  };

  const updateProps = async (patch: any) => {
    if (!selected) return;
    const nextProps = { ...selected.props, ...patch };
    setBlocks((bs) => bs.map((b) => b.id === selected.id ? { ...b, props: nextProps } : b));
    await supabase.from("page_blocks").update({ props: nextProps }).eq("id", selected.id);
  };

  const saveProps = () => toast({ title: "Хадгалагдлаа" });

  const delBlock = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    await supabase.from("page_blocks").delete().eq("id", id);
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    next.forEach((b, i) => (b.order_index = i));
    setBlocks(next);
    await Promise.all(next.map((b) => supabase.from("page_blocks").update({ order_index: b.order_index }).eq("id", b.id)));
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("page-assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = await supabase.storage.from("page-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = data?.signedUrl;
      if (url && selected) {
        if (selected.type === "image") updateProps({ src: url });
        else if (selected.type === "hero") updateProps({ image: url });
      }
      toast({ title: "Зураг орлоо" });
    } catch (e: any) {
      toast({ title: "Алдаа", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const createPage = async (slug: string, title: string) => {
    if (!slug || !title) return;
    const { data, error } = await supabase.from("pages").insert({ slug, title, published: true }).select().single();
    if (error) return toast({ title: "Алдаа", description: error.message, variant: "destructive" });
    setPages((ps) => [...ps, data as Page]);
    setActivePage(data as Page);
    setNewPageOpen(false);
  };

  return (
    <div className="flex-1 p-3 min-h-0 flex flex-col gap-3">
      {/* Page selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <FileText className="w-4 h-4 text-primary" />
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActivePage(p); setSelectedBlockId(null); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              activePage?.id === p.id ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
            )}
          >
            {p.title} <span className="opacity-60">/{p.slug}</span>
          </button>
        ))}
        <button
          onClick={() => setNewPageOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/40 hover:bg-secondary flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Хуудас
        </button>
      </div>

      {newPageOpen && (
        <NewPageForm onCancel={() => setNewPageOpen(false)} onCreate={createPage} />
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-3 min-h-0">
        {/* Block palette + list */}
        <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border/40 text-xs font-bold uppercase tracking-widest">Блок нэмэх</div>
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                disabled={!activePage}
                className="text-left p-2 rounded-lg border border-border/40 hover:border-primary/50 text-[11px] disabled:opacity-40"
              >
                <div>{bt.icon}</div>
                {bt.label}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-y border-border/40 text-xs font-bold uppercase tracking-widest">Блокууд ({blocks.length})</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {blocks.map((b, i) => (
              <div
                key={b.id}
                className={cn(
                  "p-2 rounded-lg border text-xs flex items-center gap-1",
                  selectedBlockId === b.id ? "border-primary bg-primary/10" : "border-border/40"
                )}
              >
                <button onClick={() => setSelectedBlockId(b.id)} className="flex-1 text-left truncate">
                  <span className="opacity-60">#{i + 1}</span> {b.type}
                </button>
                <button onClick={() => move(b.id, -1)} className="p-0.5 hover:text-primary"><ArrowUp className="w-3 h-3" /></button>
                <button onClick={() => move(b.id, 1)} className="p-0.5 hover:text-primary"><ArrowDown className="w-3 h-3" /></button>
                <button onClick={() => delBlock(b.id)} className="p-0.5 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            {blocks.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">Блок байхгүй</p>}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Preview</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {blocks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBlockId(b.id)}
                className={cn(
                  "cursor-pointer rounded-xl transition-all",
                  selectedBlockId === b.id && "ring-2 ring-primary"
                )}
              >
                <BlockRenderer block={b} />
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-16">Зүүнээс блок нэмнэ үү</p>
            )}
          </div>
        </div>

        {/* Props editor */}
        <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest">Тохиргоо</span>
            {selected && (
              <button onClick={saveProps} className="text-primary text-xs flex items-center gap-1"><Save className="w-3 h-3" /> Хадгалах</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!selected && <p className="text-xs text-muted-foreground text-center py-8">Блок сонго</p>}
            {selected && (
              <PropsForm
                block={selected}
                onChange={updateProps}
                onUpload={() => fileRef.current?.click()}
                uploading={uploading}
              />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
        </div>
      </div>
    </div>
  );
}

function NewPageForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (slug: string, title: string) => void }) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  return (
    <div className="rounded-xl border border-primary/30 bg-card/60 p-3 flex gap-2 items-end flex-wrap">
      <div>
        <p className="text-[10px] uppercase text-muted-foreground mb-1">Slug (жишээ: about)</p>
        <input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} className="px-2 py-1.5 rounded bg-background border border-border/50 text-xs" placeholder="home" />
      </div>
      <div className="flex-1 min-w-40">
        <p className="text-[10px] uppercase text-muted-foreground mb-1">Гарчиг</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border/50 text-xs" placeholder="Нүүр" />
      </div>
      <button onClick={() => onCreate(slug, title)} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-bold">Үүсгэх</button>
      <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      {children}
    </label>
  );
}
const inp = "w-full px-2 py-1.5 rounded bg-background border border-border/50 text-xs";

function PropsForm({ block, onChange, onUpload, uploading }: { block: Block; onChange: (p: any) => void; onUpload: () => void; uploading: boolean }) {
  const p = block.props || {};
  const t = block.type;

  if (t === "hero") return (
    <>
      <Field label="Eyebrow"><input className={inp} value={p.eyebrow || ""} onChange={(e) => onChange({ eyebrow: e.target.value })} /></Field>
      <Field label="Title"><input className={inp} value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><textarea className={inp + " min-h-16"} value={p.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field>
      <Field label="CTA label"><input className={inp} value={p.cta_label || ""} onChange={(e) => onChange({ cta_label: e.target.value })} /></Field>
      <Field label="CTA href"><input className={inp} value={p.cta_href || ""} onChange={(e) => onChange({ cta_href: e.target.value })} /></Field>
      <Field label="Image URL">
        <input className={inp} value={p.image || ""} onChange={(e) => onChange({ image: e.target.value })} placeholder="https://..." />
        <button onClick={onUpload} disabled={uploading} className="mt-1 w-full py-1.5 rounded bg-secondary text-xs flex items-center justify-center gap-1">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
        </button>
      </Field>
    </>
  );
  if (t === "heading") return (
    <>
      <Field label="Level">
        <select className={inp} value={p.level || 2} onChange={(e) => onChange({ level: parseInt(e.target.value) })}>
          <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option><option value={4}>H4</option>
        </select>
      </Field>
      <Field label="Text"><input className={inp} value={p.text || ""} onChange={(e) => onChange({ text: e.target.value })} /></Field>
    </>
  );
  if (t === "text") return <Field label="Text"><textarea className={inp + " min-h-32"} value={p.text || ""} onChange={(e) => onChange({ text: e.target.value })} /></Field>;
  if (t === "image") return (
    <>
      <Field label="URL">
        <input className={inp} value={p.src || ""} onChange={(e) => onChange({ src: e.target.value })} />
        <button onClick={onUpload} disabled={uploading} className="mt-1 w-full py-1.5 rounded bg-secondary text-xs flex items-center justify-center gap-1">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
        </button>
      </Field>
      <Field label="Alt"><input className={inp} value={p.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} /></Field>
      <Field label="Caption"><input className={inp} value={p.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} /></Field>
    </>
  );
  if (t === "cta") return (
    <>
      <Field label="Title"><input className={inp} value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Subtitle"><input className={inp} value={p.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field>
      <Field label="CTA label"><input className={inp} value={p.cta_label || ""} onChange={(e) => onChange({ cta_label: e.target.value })} /></Field>
      <Field label="CTA href"><input className={inp} value={p.cta_href || ""} onChange={(e) => onChange({ cta_href: e.target.value })} /></Field>
    </>
  );
  if (t === "quote") return (
    <>
      <Field label="Text"><textarea className={inp + " min-h-20"} value={p.text || ""} onChange={(e) => onChange({ text: e.target.value })} /></Field>
      <Field label="Author"><input className={inp} value={p.author || ""} onChange={(e) => onChange({ author: e.target.value })} /></Field>
    </>
  );
  if (t === "video") return (
    <>
      <Field label="Embed URL"><input className={inp} value={p.src || ""} onChange={(e) => onChange({ src: e.target.value })} placeholder="https://www.youtube.com/embed/..." /></Field>
      <Field label="Title"><input className={inp} value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} /></Field>
    </>
  );
  if (t === "feature_grid" || t === "stats") {
    const items = Array.isArray(p.items) ? p.items : [];
    const update = (i: number, patch: any) => {
      const next = items.map((it: any, j: number) => j === i ? { ...it, ...patch } : it);
      onChange({ items: next });
    };
    const add = () => onChange({ items: [...items, t === "stats" ? { value: "0", label: "" } : { icon: "⭐", title: "", desc: "" }] });
    const rm = (i: number) => onChange({ items: items.filter((_: any, j: number) => j !== i) });
    return (
      <>
        {items.map((it: any, i: number) => (
          <div key={i} className="rounded-lg border border-border/40 p-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">#{i + 1}</span>
              <button onClick={() => rm(i)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
            {t === "stats" ? (
              <>
                <input className={inp} value={it.value || ""} onChange={(e) => update(i, { value: e.target.value })} placeholder="Утга" />
                <input className={inp} value={it.label || ""} onChange={(e) => update(i, { label: e.target.value })} placeholder="Тайлбар" />
              </>
            ) : (
              <>
                <input className={inp} value={it.icon || ""} onChange={(e) => update(i, { icon: e.target.value })} placeholder="Emoji" />
                <input className={inp} value={it.title || ""} onChange={(e) => update(i, { title: e.target.value })} placeholder="Гарчиг" />
                <input className={inp} value={it.desc || ""} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Тайлбар" />
              </>
            )}
          </div>
        ))}
        <button onClick={add} className="w-full py-1.5 rounded bg-secondary text-xs flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Нэмэх</button>
      </>
    );
  }
  return <p className="text-xs text-muted-foreground">Тохиргоо байхгүй</p>;
}
