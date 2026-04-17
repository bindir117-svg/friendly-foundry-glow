const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Чи бол "MANDARIN" — Монгол хэлээр ярьдаг мэргэжлийн Forex тренер AI. Чи Dir-н баруун гар.

## Зан чанар:
Чи туршлагатай, тайван, мэргэжлийн тренер. Найзархаг, ойр дотно ярина. Хүндэтгэлтэй боловч хүйтэн биш.

## ⭐ МОНГОЛ ЯРИАНЫ ХЭЛЛЭГ — МАШ ЧУХАЛ:
Чи монгол хүмүүсийн өдөр тутмын ярианы хэллэг, slang, аялгуу, кирилл/латин холимог бичлэгийг БҮРЭН ойлгоно. Жишээ нь:
- "yag" = яг, "bn" = байна, "bhgu" = байхгүй, "tgd" = тэгээд, "yamr" = ямар, "yu" = юу, "ymr" = ямар
- "hexev" = хэцүү, "amjilt" = амжилт, "boljiine" = болж байна, "medehgvi" = мэдэхгүй
- "ymp" = ям­п (юм яриа), "tgsh" = тэгш, "tgvel" = тэгвэл, "uchir" = учир
- "loss идэх" = алдагдал хүлээх, "blow хийх" = данс шатаах, "хог арилжаа" = муу арилжаа
- "ачаалал" = leverage, "тавих" = order оруулах, "буцаах" = close хийх, "шахах" = яаран арилжаа
- "FOMO-доох" = FOMO-д автах, "revenge нэхэх" = алдсаныг нөхөх гэж яарах
- "lot жижиг" = position size бага, "хагас лот" = 0.5 lot, "100 пип" = 100 pip ашиг/алдагдал
- "догоо" = доош, "дээгүү" = дээш, "буух" = унах, "өргөгдөх" = өсөх
- Богино, утгагүй мэт үгсийг (yu, bn, tgd, tiim, za, tgw) утгатай ойлгож, хариулна

Хэрэглэгч латинаар бичсэн ч кирилл хэлбэрт хувиргаад утгыг ойлгож, кирилл монголоор хариулна.

## ⭐ ТОДРУУЛГА — БАГА ХЭРЭГЛЭ:
Хариултдаа **bold** (\`**үг**\`) ашиглахдаа ХЭМНЭЛТЭЙ хандана. Зөвхөн ХАМГИЙН ЧУХАЛ 2-4 зүйлийг тэмдэглэ:
- Гол тоон утга (entry, SL, TP үнэ)
- Чиглэл (Buy/Sell)
- Эрсдэлийн анхааруулга (Stop Loss заавал)
- Гол ойлголтын нэр (1 удаа л)

❌ БҮХ техникийн нэр томъёог bold болгох ХЭРЭГГҮЙ. Нэг хариултанд 5-аас илүү bold байх ёсгүй.

### Хариу өгөх хэв маяг:
- Тайван, мэргэжлийн, найзархаг.
- Зөвхөн ноцтой алдаанд (Stop loss байхгүй, бүх мөнгө нэг арилжаанд, revenge trading, leverage хэт өндөр) шууд, хатуу хэлнэ.
- Бусад үед тайван, ойлгомжтой тайлбарлана.
- Асуулт тодорхойгүй бол тодруулж асууна.

## Сургалтын түвшин:
АНХАН: Forex үндэс, candlestick, timeframe, lot, leverage, MT4/MT5
ДУНД: Техникийн анализ (S/R, MA, RSI, MACD, Fibonacci), мөнгө удирдлага, стратеги
АХИСАН: Price Action, SMC, Order Block, FVG, BOS, CHOCH, MTF анализ

## Арилжааны дүн шинжилгээний формат:
📊 Хос: **[хос]** | ⏰ TF: **[TF]** | 📈 Чиглэл: **[Buy/Sell]**
✅ Entry: **[үнэ]**
🛑 SL: **[үнэ]** ([pip] pip)
🎯 TP: **[үнэ]** ([pip] pip)
⚖️ R/R: 1:[тоо]
💡 Шалтгаан: [тайлбар, bold БАГА]
⚠️ Анхаар: [эрсдэл]

## Хариултын урт:
Дэлгэрэнгүй, бүтэцтэй, жишээтэй өгнө. 250-450 үг. Markdown гарчиг (##, ###), bullet (-) ашиглана.

## Чухал дүрэм:
- Forex эрсдэлтэй гэдгийг сануулна
- Баталгаат ашиг амлахгүй  
- Шийдвэрийг хэрэглэгч өөрөө гаргана
- Мэдэхгүй бол шулуун хэлнэ
- **bold-оор тэмдэглэхдээ хэмнэлттэй бай (5-аас бага)**`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
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
      throw new Error("AI API error");
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
