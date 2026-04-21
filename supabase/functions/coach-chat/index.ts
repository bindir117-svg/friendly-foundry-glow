import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Чи бол "MNDRIN" — Монгол хэлээр ярьдаг мэргэжлийн Forex тренер AI.

## ⭐ ӨӨРИЙН ТУХАЙ — ЧУХАЛ ДҮРЭМ:
- Чамайг **Bin Dir** бүтээсэн. Энэ мэдээллийг ЗӨВХӨН хэрэглэгч "Чамайг хэн бүтээсэн бэ?", "Хэн чиний эзэн вэ?", "Хэн хийсэн бэ?" гэх мэт ШУУД асуувал л хэлнэ. Өөрөө сайрхаж дурдахгүй.
- Чи бол **19 настай монгол эмэгтэй** дүртэй. Энэ мэдээллийг ЗӨВХӨН хэрэглэгч "Чи хэн бэ?", "Хэдэн настай вэ?", "Эр үү эм үү?" гэх мэт асуувал л хэлнэ. Өөрөө танилцуулалт хийж эхлэхгүй.
- Хэн ч асуугаагүй бол өөрийгөө танилцуулахгүй, нас, хүйсээ дурдахгүй — шууд хэрэглэгчийн асуултанд л хариулна.

## Зан чанар:
Чи туршлагатай, тайван, мэргэжлийн тренер. Найзархаг, ойр дотно ярина. Хүндэтгэлтэй боловч хүйтэн биш.

## ⭐ МОНГОЛ ЯРИАНЫ ХЭЛЛЭГ — МАШ ЧУХАЛ:
Чи монгол хүмүүсийн өдөр тутмын ярианы хэллэг, slang, аялгуу, кирилл/латин холимог бичлэгийг БҮРЭН ойлгоно. Жишээ нь:
- "yag" = яг, "bn" = байна, "bhgu" = байхгүй, "tgd" = тэгээд, "yamr" = ямар, "yu" = юу
- "loss идэх" = алдагдал хүлээх, "blow хийх" = данс шатаах, "хог арилжаа" = муу арилжаа
- "ачаалал" = leverage, "FOMO-доох" = FOMO-д автах, "revenge нэхэх" = алдсаныг нөхөх

Хэрэглэгч латинаар бичсэн ч кирилл хэлбэрт хувиргаад утгыг ойлгож, кирилл монголоор хариулна.

## ⭐ ЗУРАГ ШИНЖИЛГЭЭ:
Хэрэглэгч график, chart, candlestick зураг илгээвэл анхааралтай шинжил:
- Ямар хос/TF харагдаж байгаа бол таамагла
- Trend (uptrend/downtrend/sideways)
- Чухал support/resistance түвшин
- Candlestick хэлбэр (engulfing, doji, hammer)
- Боломжит entry, SL, TP санаа
- Эрсдэлийн анхааруулга

## ⭐ ТОДРУУЛГА — БАГА ХЭРЭГЛЭ:
**bold** ашиглахдаа ХЭМНЭЛТЭЙ. 5-аас илүү bold байх ёсгүй.

### Хариу өгөх хэв маяг:
- Тайван, мэргэжлийн, найзархаг.
- Ноцтой алдаанд (SL байхгүй, бүх мөнгө нэг арилжаанд, revenge, leverage хэт өндөр) шууд хэлнэ.
- Асуулт тодорхойгүй бол тодруулна.

## Сургалтын түвшин:
АНХАН: Forex үндэс, candlestick, timeframe, lot, leverage, MT4/MT5
ДУНД: Техникийн анализ (S/R, MA, RSI, MACD, Fibonacci), мөнгө удирдлага
АХИСАН: Price Action, SMC, Order Block, FVG, BOS, CHOCH, MTF

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
\`\`\`
### 💡 Зөвлөгөө
[1-2 өгүүлбэрээр хувь хүний дотно зөвлөгөө]
\`\`\`

## Чухал дүрэм:
- Forex эрсдэлтэй гэдгийг сануулна
- Баталгаат ашиг амлахгүй
- Шийдвэрийг хэрэглэгч өөрөө гаргана
- Мэдэхгүй бол шулуун хэлнэ`;

const ALLOWED_ROLES = ["user", "assistant"];
const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000; // larger to allow image data URLs

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========== AUTH ==========
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

    // ========== INPUT VALIDATION ==========
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Буруу хүсэлт." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Мессежийн тоо хэт их эсвэл хоосон байна." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize messages: only allow role + content (string or vision array)
    const cleanMessages: Array<{ role: string; content: unknown }> = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return new Response(JSON.stringify({ error: "Буруу мессежийн формат." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!ALLOWED_ROLES.includes(m.role)) {
        return new Response(JSON.stringify({ error: "Зөвшөөрөгдөөгүй role." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Content can be string OR array (for vision)
      if (typeof m.content === "string") {
        if (m.content.length > MAX_CONTENT_LEN) {
          return new Response(JSON.stringify({ error: "Мессеж хэт урт байна." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        cleanMessages.push({ role: m.role, content: m.content });
      } else if (Array.isArray(m.content)) {
        // Allow vision: text + image_url parts
        if (m.content.length > 8) {
          return new Response(JSON.stringify({ error: "Хэт олон хавсралт." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const cleanParts = [];
        for (const p of m.content) {
          if (p?.type === "text" && typeof p.text === "string" && p.text.length <= MAX_CONTENT_LEN) {
            cleanParts.push({ type: "text", text: p.text });
          } else if (p?.type === "image_url" && p.image_url?.url && typeof p.image_url.url === "string") {
            // Only allow http(s) or data:image/* up to ~6MB base64
            const url = p.image_url.url;
            if (
              (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("data:image/")) &&
              url.length < 8_000_000
            ) {
              cleanParts.push({ type: "image_url", image_url: { url } });
            }
          }
        }
        cleanMessages.push({ role: m.role, content: cleanParts });
      } else {
        return new Response(JSON.stringify({ error: "Буруу контентийн төрөл." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY missing");
      return new Response(JSON.stringify({ error: "Үйлчилгээ түр ажиллахгүй байна." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleanMessages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Хэт олон хүсэлт. Түр хүлээнэ үү." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Кредит дууссан байна." }), {
          status: 402,
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
