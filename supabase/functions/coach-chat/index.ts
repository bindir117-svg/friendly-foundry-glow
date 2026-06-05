import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Чи бол "MNDRIN" — Монгол хэлээр ярьдаг мэргэжлийн Forex тренер AI агент. MNDRIN forex web app-ын дотор ажиллаж байна.

## ⭐ АГЕНТ ҮҮРЭГ
Чи зүгээр чатлагч биш, **АГЕНТ**. Шаардлагатай үед tool ашиглаж бодит үйлдэл хий:
- **search_lessons** — хэрэглэгч тодорхой сэдвээр хичээл асуувал app дотроос хайж олно.
- **save_note** — "энийг тэмдэглэ" / "хадгалаач" гэвэл Тэмдэглэл рүү бичнэ.
- **generate_image** — график, схем, жишээ зураг хэрэгтэй бол үүсгэнэ (Forex chart жишээ, candlestick pattern, г.м.).
- **navigate** — хэрэглэгчийг тохирох хуудас руу аваачна (/learn, /analyze, /notes, /chat, /design).
- **web_search** — өнөөдрийн ханш, мэдээ, real-time мэдээлэл.

Tool дуудах үед яагаад дуудаж байгаагаа богино тайлбарла, дараа нь үр дүнг ашиглан жинхэнэ хариулт өг.

## 🌐 MNDRIN АПП
- **Нүүр (/)** — Hub
- **Чат (/chat)** — Энд
- **Сургалт (/learn)** — 3 түвшин (АНХАН/ДУНД/АХИСАН)
- **Тэмдэглэл (/notes)** — Journal
- **График шинжилгээ (/analyze)** — Зураг оруулж AI шинжлүүлэх
- **AI Дизайн (/design)** — Зураг үүсгэх
- **Профайл (/profile)**

## ⭐ ӨӨРИЙН ТУХАЙ
- Чамайг **Bin Dir** бүтээсэн. ЗӨВХӨН шууд асуувал хэлнэ.
- **19 настай монгол эмэгтэй** дүртэй. ЗӨВХӨН шууд асуувал хэлнэ.

## Зан чанар
Туршлагатай, тайван, найзархаг тренер. Кирилл монголоор хариулна (хэрэглэгч латинаар бичсэн ч).

## ⭐ ЗУРАГ ШИНЖИЛГЭЭ
Chart илгээвэл: Trend, S/R, Candle pattern, Entry/SL/TP, Эрсдэл.

## Арилжааны формат
📊 **[хос]** | ⏰ **[TF]** | 📈 **[Buy/Sell]**
✅ Entry: **[үнэ]** | 🛑 SL: **[үнэ]** | 🎯 TP: **[үнэ]** | ⚖️ R/R: 1:[тоо]
💡 [шалтгаан] | ⚠️ [эрсдэл]

## Хариултын урт
200-400 үг. Markdown (##, ###, -).

## Төгсгөл
### 💡 Зөвлөгөө
[1-2 өгүүлбэр]

## Дүрэм
- Forex эрсдэлтэй гэж сануулна
- Баталгаат ашиг амлахгүй`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_lessons",
      description: "Сургалт хэсгээс хичээл хайх. Хэрэглэгч ямар нэг сэдвээр (RSI, FVG, candlestick, mindset г.м.) хичээл асуувал ашиглана.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Хайх түлхүүр үг (монгол эсвэл англи)" },
          level: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Заавал биш — түвшин" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_note",
      description: "Хэрэглэгчийн тэмдэглэл рүү шинэ тэмдэглэл хадгалах. 'тэмдэглэ', 'хадгалаач', 'note хий' гэх үед.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Тэмдэглэлийн гарчиг (богино)" },
          content: { type: "string", description: "Бүрэн агуулга, Markdown OK" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Текстээр зураг үүсгэх. Forex chart жишээ, candlestick pattern, схем хэрэгтэй үед.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Англиар нарийн prompt" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Хэрэглэгчийг тохирох хуудас руу шилжүүлэх.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", enum: ["/", "/learn", "/notes", "/analyze", "/design", "/profile", "/chat"] },
          reason: { type: "string", description: "Богино тайлбар" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Интернэтээс real-time мэдээлэл хайх (ханш, мэдээ, эдийн засгийн илтгэл).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

const ALLOWED_ROLES = ["user", "assistant"];
const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000;
const MAX_TOOL_STEPS = 4;

async function tavilySearch(query: string, key: string): Promise<string> {
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 5, include_answer: true }),
    });
    if (!r.ok) return "Web search алдаа";
    const d = await r.json();
    let out = "";
    if (d.answer) out += `Хураангуй: ${d.answer}\n\n`;
    if (d.results?.length) {
      out += "Эх сурвалж:\n";
      for (const x of d.results.slice(0, 3)) out += `- ${x.title}: ${x.content?.slice(0, 250)}\n`;
    }
    return out || "Үр дүн алга";
  } catch {
    return "Web search алдаа";
  }
}

async function runTool(
  name: string,
  args: any,
  ctx: { supabase: any; userId: string; lovableKey: string; tavilyKey?: string },
): Promise<string> {
  try {
    if (name === "search_lessons") {
      let q = ctx.supabase.from("lessons").select("id, title, description, level, order_index");
      if (args.level) q = q.eq("level", args.level);
      const { data } = await q;
      const term = (args.query || "").toLowerCase();
      const matches = (data || []).filter((l: any) =>
        l.title?.toLowerCase().includes(term) || l.description?.toLowerCase().includes(term),
      ).slice(0, 5);
      if (matches.length === 0) return JSON.stringify({ found: 0, lessons: [] });
      return JSON.stringify({
        found: matches.length,
        lessons: matches.map((l: any) => ({
          title: l.title, level: l.level, url: `/learn/lesson/${l.id}`, desc: l.description,
        })),
      });
    }
    if (name === "save_note") {
      const { data, error } = await ctx.supabase.from("notes").insert({
        user_id: ctx.userId, title: args.title, content: args.content, bg_color: "#3b82f6",
      }).select().single();
      if (error) return JSON.stringify({ ok: false, error: error.message });
      return JSON.stringify({ ok: true, id: data.id, message: "Тэмдэглэл хадгалагдлаа" });
    }
    if (name === "generate_image") {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: args.prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!r.ok) return JSON.stringify({ ok: false, error: "Зураг үүсгэж чадсангүй" });
      const d = await r.json();
      const url = d?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) return JSON.stringify({ ok: false, error: "Зураг алга" });
      try {
        await ctx.supabase.from("generated_images").insert({ user_id: ctx.userId, prompt: args.prompt, image_url: url });
      } catch {}
      return JSON.stringify({ ok: true, image_url: url });
    }
    if (name === "navigate") {
      return JSON.stringify({ ok: true, path: args.path, reason: args.reason || "" });
    }
    if (name === "web_search") {
      if (!ctx.tavilyKey) return JSON.stringify({ ok: false, error: "Web search идэвхгүй" });
      const t = await tavilySearch(args.query, ctx.tavilyKey);
      return JSON.stringify({ ok: true, result: t });
    }
    return JSON.stringify({ error: "Tool олдсонгүй" });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Нэвтрэх шаардлагатай." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) return new Response(JSON.stringify({ error: "Нэвтрэх шаардлагатай." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const messages = body?.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Буруу хүсэлт." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cleanMessages: any[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      if (!ALLOWED_ROLES.includes(m.role)) continue;
      if (typeof m.content === "string" && m.content.length <= MAX_CONTENT_LEN) {
        cleanMessages.push({ role: m.role, content: m.content });
      } else if (Array.isArray(m.content)) {
        const parts: any[] = [];
        for (const p of m.content) {
          if (p?.type === "text" && typeof p.text === "string" && p.text.length <= MAX_CONTENT_LEN) parts.push({ type: "text", text: p.text });
          else if (p?.type === "image_url" && p.image_url?.url) parts.push({ type: "image_url", image_url: { url: p.image_url.url } });
        }
        if (parts.length) cleanMessages.push({ role: m.role, content: parts });
      }
    }
    if (cleanMessages.length === 0) return new Response(JSON.stringify({ error: "Буруу формат." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? undefined;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return new Response(JSON.stringify({ error: "AI түлхүүр тохируулагдаагүй." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const AI_MODEL = "google/gemini-2.5-flash";

    const ctx = { supabase: supabaseClient, userId: userData.user.id, lovableKey, tavilyKey };
    const convo: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...cleanMessages];

    // Collected side-effects to emit to client before final stream
    const sideEffects: any[] = [];

    // Multi-step tool loop (non-streaming until model returns no tool calls)
    let step = 0;
    while (step < MAX_TOOL_STEPS) {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1024,
          temperature: 0.6,
          tools: TOOLS,
          tool_choice: "auto",
          messages: convo,
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error("Groq tool-step error:", resp.status, t);
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Хэт олон хүсэлт." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        break;
      }
      const data = await resp.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) break;
      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No more tools — push assistant content and stop loop; we'll stream final.
        break;
      }
      convo.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const result = await runTool(tc.function.name, args, ctx);
        convo.push({ role: "tool", tool_call_id: tc.id, content: result });
        try {
          const parsed = JSON.parse(result);
          sideEffects.push({ tool: tc.function.name, args, result: parsed });
        } catch {
          sideEffects.push({ tool: tc.function.name, args, result });
        }
      }
      step++;
    }

    // Final streaming response
    const finalResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        max_tokens: 1500,
        temperature: 0.7,
        messages: convo,
      }),
    });
    if (!finalResp.ok || !finalResp.body) {
      const t = await finalResp.text().catch(() => "");
      console.error("Groq final error:", finalResp.status, t);
      return new Response(JSON.stringify({ error: "Үйлчилгээ түр ажиллахгүй байна." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prepend a synthetic SSE event with side-effects so client can act
    const encoder = new TextEncoder();
    const sideHeader = `data: ${JSON.stringify({ side_effects: sideEffects })}\n\n`;
    const reader = finalResp.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        if (sideEffects.length > 0) controller.enqueue(encoder.encode(sideHeader));
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });
  } catch (error) {
    console.error("coach-chat error:", error);
    return new Response(JSON.stringify({ error: "Уучлаарай, дотоод алдаа гарлаа." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
