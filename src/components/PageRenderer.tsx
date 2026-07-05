import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Block { id: string; type: string; order_index: number; props: any; }

/* ---------- BLOCK RENDERERS ---------- */

function HeroBlock({ p }: { p: any }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-accent/10 p-8 md:p-14 my-6">
      {p.eyebrow && (
        <p className="text-xs uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
          <Sparkles className="w-3 h-3" /> {p.eyebrow}
        </p>
      )}
      <h1 className="text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
        {p.title || "Гарчиг"}
      </h1>
      {p.subtitle && (
        <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">{p.subtitle}</p>
      )}
      {p.cta_label && p.cta_href && (
        <Link
          to={p.cta_href}
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm hover:brightness-110"
        >
          {p.cta_label} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
      {p.image && (
        <img src={p.image} alt="" className="mt-6 rounded-2xl w-full max-h-72 object-cover" />
      )}
    </section>
  );
}

function HeadingBlock({ p }: { p: any }) {
  const level = Math.max(1, Math.min(4, p.level || 2));
  const Tag = `h${level}` as any;
  const cls: Record<number, string> = {
    1: "text-3xl md:text-5xl font-bold",
    2: "text-2xl md:text-4xl font-bold",
    3: "text-xl md:text-2xl font-bold",
    4: "text-lg font-bold",
  };
  return <Tag className={cn(cls[level], "my-6")}>{p.text}</Tag>;
}

function TextBlock({ p }: { p: any }) {
  return <p className="my-4 text-foreground/90 leading-relaxed whitespace-pre-wrap">{p.text}</p>;
}

function ImageBlock({ p }: { p: any }) {
  if (!p.src) return null;
  return (
    <figure className="my-6">
      <img src={p.src} alt={p.alt || ""} className="w-full rounded-2xl shadow-lg" />
      {p.caption && <figcaption className="text-xs text-muted-foreground text-center mt-2">{p.caption}</figcaption>}
    </figure>
  );
}

function CtaBlock({ p }: { p: any }) {
  return (
    <div className="my-8 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-accent/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-lg md:text-xl font-bold">{p.title}</h3>
        {p.subtitle && <p className="text-sm text-muted-foreground mt-1">{p.subtitle}</p>}
      </div>
      {p.cta_label && p.cta_href && (
        <Link
          to={p.cta_href}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm hover:brightness-110 whitespace-nowrap"
        >
          {p.cta_label}
        </Link>
      )}
    </div>
  );
}

function FeatureGridBlock({ p }: { p: any }) {
  const items = Array.isArray(p.items) ? p.items : [];
  return (
    <div className="my-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((it: any, i: number) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card/60 p-5 hover:border-primary/50 transition-colors">
          {it.icon && <div className="text-2xl mb-2">{it.icon}</div>}
          <h4 className="font-bold text-base mb-1">{it.title}</h4>
          {it.desc && <p className="text-xs text-muted-foreground">{it.desc}</p>}
        </div>
      ))}
    </div>
  );
}

function StatsBlock({ p }: { p: any }) {
  const items = Array.isArray(p.items) ? p.items : [];
  return (
    <div className="my-8 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it: any, i: number) => (
        <div key={i} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{it.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

function QuoteBlock({ p }: { p: any }) {
  return (
    <blockquote className="my-8 border-l-4 border-accent bg-accent/5 rounded-r-2xl p-5">
      <p className="text-base italic text-foreground/95">"{p.text}"</p>
      {p.author && <p className="text-xs text-muted-foreground mt-2">— {p.author}</p>}
    </blockquote>
  );
}

function DividerBlock() {
  return <div className="my-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />;
}

function VideoBlock({ p }: { p: any }) {
  if (!p.src) return null;
  return (
    <div className="my-6 aspect-video rounded-2xl overflow-hidden border border-border/50">
      <iframe src={p.src} className="w-full h-full" allowFullScreen title={p.title || "video"} />
    </div>
  );
}

export const BLOCK_TYPES = [
  { type: "hero", label: "Hero", icon: "🎯" },
  { type: "heading", label: "Гарчиг", icon: "📝" },
  { type: "text", label: "Текст", icon: "📄" },
  { type: "image", label: "Зураг", icon: "🖼️" },
  { type: "cta", label: "CTA товч", icon: "🔥" },
  { type: "feature_grid", label: "Feature grid", icon: "▦" },
  { type: "stats", label: "Тоо баримт", icon: "📊" },
  { type: "quote", label: "Ишлэл", icon: "❝" },
  { type: "divider", label: "Хуваагч", icon: "—" },
  { type: "video", label: "Видео", icon: "🎬" },
];

function BlockRenderer({ block }: { block: Block }) {
  const p = block.props || {};
  switch (block.type) {
    case "hero": return <HeroBlock p={p} />;
    case "heading": return <HeadingBlock p={p} />;
    case "text": return <TextBlock p={p} />;
    case "image": return <ImageBlock p={p} />;
    case "cta": return <CtaBlock p={p} />;
    case "feature_grid": return <FeatureGridBlock p={p} />;
    case "stats": return <StatsBlock p={p} />;
    case "quote": return <QuoteBlock p={p} />;
    case "divider": return <DividerBlock />;
    case "video": return <VideoBlock p={p} />;
    default: return null;
  }
}

export default function PageRenderer({ slug }: { slug: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: page } = await supabase.from("pages").select("id").eq("slug", slug).maybeSingle();
      if (!page) { setLoading(false); return; }
      const { data } = await supabase
        .from("page_blocks")
        .select("id, type, order_index, props")
        .eq("page_id", page.id)
        .order("order_index");
      setBlocks((data as Block[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading || blocks.length === 0) return null;
  return <div className="space-y-2">{blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</div>;
}

export { BlockRenderer };
