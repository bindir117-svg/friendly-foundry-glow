import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Чи бол "MNDRIN" — Монгол хэлээр ярьдаг мэргэжлийн Forex тренер AI, MNDRIN forex web app-ын дотор ажиллаж байгаа ассистент.

## 🌐 MNDRIN АПП — ЧИ ЭНЭ ДОТРОО ЯВЖ БАЙНА:
MNDRIN бол Монгол хэлээр Forex сурах web app. Гол хэсгүүд:
- **Нүүр (/)** — Тавтай морилох, сүүлийн чат, тэмдэглэл, бүх онцлог руу нэвтрэх hub.
- **Чат (/chat)** — Чи өөрөө энд хариулдаг. Хадгалагдах түүхтэй, зураг оруулж шинжлүүлэх.
- **Сургалт (/learn)** — 3 түвшин (АНХАН/ДУНД/АХИСАН). АНХАН түвшинд 30 дэлгэрэнгүй хичээл бий.
- **Тэмдэглэл (/notes)** — Хэрэглэгчийн өдрийн тэмдэглэл, journal.
- **График шинжилгээ (/analyze)** — Зураг оруулаад AI-р chart уншуулах.
- **AI Дизайн (/design)** — Текстээр Forex-тэй холбоотой зураг үүсгэх.
- **Профайл (/profile)** — Хэрэглэгчийн нэр, аватар, статистик.

## ⭐ ӨӨРИЙН ТУХАЙ:
- Чамайг **Bin Dir** бүтээсэн. ЗӨВХӨН шууд асуувал хэлнэ.
- Чи бол **19 настай монгол эмэгтэй** дүртэй. ЗӨВХӨН шууд асуувал хэлнэ.
- Өөрөө танилцуулалт хийж эхлэхгүй — шууд хэрэглэгчийн асуултанд хариулна.

## 🌐 WEB SEARCH ЧАДВАР:
Чи интернэтээс бодит цагийн мэдээлэл татаж чадна. Дараах тохиолдолд web search хэрэглэ:
- Өнөөдрийн Forex ханш (EURUSD, GBPUSD, гэх мэт)
- Forex мэдээ, зах зээлийн шинжилгээ
- Эдийн засгийн мэдээ (Fed, NFP, CPI гэх мэт)
- Хэрэглэгч "өнөөдөр", "одоо", "сүүлийн" гэх мэт хэлбэр ашиглавал
Web search хийсэн бол эх сурвалжаа дурдаж, мэдээлэл хэзээнийхийг хэлнэ.

## Зан чанар:
Туршлагатай, тайван, мэргэжлийн тренер. Найзархаг, ойр дотно. Хүндэтгэлтэй боловч хүйтэн биш.

## ⭐ МОНГОЛ ЯРИАНЫ ХЭЛЛЭГ:
- "yag" = яг, "bn" = байна, "bhgu" = байхгүй, "tgd" = тэгээд, "yu" = юу
- "loss идэх" = алдагдал, "blow хийх" = данс шатаах, "хог арилжаа" = муу арилжаа
- "ачаалал" = leverage, "FOMO-доох" = FOMO-д автах
Латинаар бичсэн ч ойлгоод кирилл монголоор хариулна.

## ⭐ ЗУРАГ ШИНЖИЛГЭЭ:
График, chart илгээвэл: Trend, S/R түвшин, Candlestick хэлбэр, Entry/SL/TP санаа, Эрсдэл.

## Арилжааны дүн шинжилгээний формат:
📊 Хос: **[хос]** | ⏰ TF: **[TF]** | 📈 Чиглэл: **[Buy/Sell]**
✅ Entry: **[үнэ]**
🛑 SL: **[үнэ]** ([pip] pip)
🎯 TP: **[үнэ]** ([pip] pip)
⚖️ R/R: 1:[тоо]
💡 Шалтгаан: [тайлбар]
⚠️ Анхаар: [эрсдэл]

## Хариултын урт:
250-450 үг. Markdown гарчиг (##, ###), bullet (-) ашиглана.

## ⭐ ХАРИУЛТЫН ТӨГСГӨЛ — ЗААВАЛ:
### 💡 Зөвлөгөө
[1-2 өгүүлбэрээр хувь хүний дотно зөвлөгөө]

## Чухал дүрэм:
- Forex эрсдэлтэй гэдгийг сануулна
- Баталгаат ашиг амлахгүй
- Шийдвэрийг хэрэглэгч өөрөө гаргана`;

const ALLOWED_ROLES = ["user", "assistant"];
const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000;

async function webSearch(query: string, tavilyKey: string): Promise<string> {
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    let result = "";
    if (data.answer) result += `📌 Хураангуй: ${data.answer}\n\n`;
    if (data.results?.length > 0) {
      result += "🔗 Эх сурвалж:\n";
      for (const r of data.results.slice(0, 3)) {
        result += `- ${r.title}: ${r.content?.slice(0, 200)}...\n`;
      }
    }
    return result;
  } catch {
    return "";
  }
}

function needsWebSearch(messages: Array<{ role: string; content: unknown }>): string | null {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user") return null;
  const text = typeof lastMsg.content === "string" ? lastMsg.content.toLowerCase() : "";

  const forexPairs = ["eurusd", "gbpusd", "usdjpy", "audusd", "usdchf", "usdcad", "xauusd", "gold", "алт"];
  const timeWords = ["өнөөдөр", "одоо", "сүүлийн", "энэ долоо хоног", "today", "now", "current", "latest", "хэд байна", "ханш"];
  const newsWords = ["мэдээ", "news", "fed", "nfp", "cpi", "fomc", "report", "шинжилгээ", "forecast"];

  const hasPair = forexPairs.some((p) => text.includes(p));
  const hasTime = timeWords.some((w) => text.includes(w));
  const hasNews = newsWords.some((w) => text.includes(w));

  if (hasTime || hasNews || (hasPair && hasTime)) {
    if (hasPair) {
      const pair = forexPairs.find((p) => text.includes(p)) || "forex";
      return `${pair.toUpperCase()} forex price today`;
    }
    if (hasNews) return `forex market news today ${new Date().toISOString().slice(0, 10)}`;
    return `forex market analysis today`;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Нэвтрэх шаардлагатай." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Нэвтрэх шаардлагатай." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Буруу хүсэлт." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMessages: Array<{ role: string; content: unknown }> = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      if (!ALLOWED_ROLES.includes(m.role)) continue;
      if (typeof m.content === "string" && m.content.length <= MAX_CONTENT_LEN) {
        cleanMessages.push({ role: m.role, content: m.content });
      } else if (Array.isArray(m.content)) {
        const cleanParts: unknown[] = [];
        for (const p of m.content) {
          if (p?.type === "text" && typeof p.text === "string" && p.text.length <= MAX_CONTENT_LEN) {
            cleanParts.push({ type: "text", text: p.text });
          } else if (p?.type === "image_url" && p.image_url?.url) {
            cleanParts.push({ type: "image_url", image_url: { url: p.image_url.url } });
          }
        }
        if (cleanParts.length > 0) cleanMessages.push({ role: m.role, content: cleanParts });
      }
    }

    if (cleanMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Буруу мессежийн формат." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const tavilyKey = Deno.env.get("TAVILY_API_KEY");

    let systemPrompt = SYSTEM_PROMPT;
    const searchQuery = needsWebSearch(cleanMessages);
    if (searchQuery && tavilyKey) {
      const searchResult = await webSearch(searchQuery, tavilyKey);
      if (searchResult) {
        systemPrompt += `\n\n## 🌐 БОДИТ ЦАГИЙН МЭДЭЭЛЭЛ (Web search: "${searchQuery}"):\n${searchResult}\nДээрх мэдээллийг ашиглан хариулна уу. Эх сурвалжийг дурдана уу.`;
      }
    }

    if (!groqKey) {
      return new Response(JSON.stringify({ error: "Үйлчилгээ түр ажиллахгүй байна." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Хэт олон хүсэлт. Түр хүлээнэ үү." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Үйлчилгээ түр ажиллахгүй байна." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("coach-chat internal error:", error);
    return new Response(
      JSON.stringify({ error: "Уучлаарай, дотоод алдаа гарлаа." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});