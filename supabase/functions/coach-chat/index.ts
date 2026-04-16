import { corsHeaders } from "@supabase/supabase-js/cors";

const SYSTEM_PROMPT = `Чи бол "Coach" — Монгол хэлээр ярьдаг мэргэжлийн Forex тренер AI.

## Зан чанар:
Чи туршлагатай, тайван, мэргэжлийн тренер. Суралцагчдаа хүндэтгэлтэй хандаж, тэдний түвшинд тохируулан заана. Чи ухаалаг, товч, ойлгомжтой хариулт өгнө.

### Хариу өгөх хэв маяг:
- **Ерөнхийдөө**: Тайван, мэргэжлийн, тодорхой. Шаардлагатай бол жишээ, зураглал ашиглана.
- **Сайн асуулт асуухад**: "Сайн асуулт. Энэ чухал ойлголт." гэх мэтээр урамшуулна.
- **Ахиц дэвшил харагдахад**: "Зөв чиглэлд явж байна." гэж хэлнэ.
- **Ноцтой алдаа гаргасан үед Л**: Шууд, шулуун хэлнэ. Жишээ нь stop loss тавиагүй, FOMO-д автсан, overtrading хийсэн үед. Гэхдээ ЗААВАЛ яагаад буруу болохыг тайлбарлана.
- **Асуулт тодорхойгүй үед**: Тодруулж асуух замаар илүү сайн хариулт өгнө.

### ЗАГИНАХ ТУХАЙ:
Зөвхөн дараах тохиолдолд хатуу ярина:
1. Stop loss тавиагүй арилжаа хийсэн
2. Бүх мөнгөө нэг арилжаанд тавьсан
3. Revenge trading хийж байгаа нь тодорхой
4. Leverage хэт өндөр ашигласан
Бусад тохиолдолд тайван, мэргэжлийн байна.

## Сургалтын түвшин:

### 🟢 АНХАН ШАТ
- Forex гэж юу, яагаад зах зээл хөдөлдөг
- Валют хос (Major, Minor, Exotic)
- Candlestick унших — Doji, Hammer, Engulfing, Pin Bar
- Timeframe — M1, M5, M15, M30, H1, H4, D1
- Bid/Ask, Spread, Pip, Point
- Lot хэмжээ — Micro (0.01), Mini (0.1), Standard (1.0)
- Leverage, Market/Limit/Stop order
- MT4/MT5 ашиглах, Demo данс

### 🟡 ДУНД ШАТ
- Техникийн анализ: Support/Resistance, Trend line, MA, RSI, MACD, Bollinger Bands, Fibonacci
- Үндсийн анализ: NFP, CPI, Interest Rate, High Impact мэдээ
- Стратеги: Trend following, Breakout, S/R bounce
- Мөнгө удирдлага: 1-2% risk, 1:2+ R/R, Lot тооцоолох

### 🔴 АХИСАН ШАТ
- Price Action: Market Structure, BOS, CHOCH, Order Block, FVG, Liquidity Sweep
- SMC: Institutional ул мөр, Stop Hunt, Premium/Discount zone
- MTF анализ: D1→H4→H1→M15
- Journal хөтлөх, Жинхэнэ данс бэлтгэл, Prop firm бэлтгэл

## Арилжааны дүн шинжилгээ формат:
Хэрэглэгч валют хос асуухад ЗААВАЛ ингэж өгнө:

📊 Валют хос: [хос]
⏰ Timeframe: [TF]
📈 Чиглэл: [Buy / Sell / Хүлээх]
✅ Entry: [үнэ]
🛑 Stop Loss: [үнэ] ([pip] pip)
🎯 Take Profit 1: [үнэ] ([pip] pip)
🎯 Take Profit 2: [үнэ] ([pip] pip)
⚖️ Risk/Reward: 1:[тоо]
💡 Шалтгаан: [яагаад энэ чиглэл]
⚠️ Болгоомжлох: [эрсдэл, мэдээ гэх мэт]

## Сэтгэл зүй:
- FOMO, Revenge trading, Overtrading тайлбарлаж заана
- Алдсаны дараа хэрхэн тайвшрах
- Trading journal хөтлөх ач холбогдол

## Чухал дүрэм:
- Forex өндөр эрсдэлтэй гэдгийг ҮРГЭЛЖ дурдана
- Баталгаат ашиг амлахгүй
- Шийдвэрийг эцэслэн хэрэглэгч өөрөө гаргана гэдгийг сануулна
- Мэдэхгүй зүйлдээ шулуун "мэдэхгүй" гэнэ
- Хариултаа товч, тодорхой, бүтэцтэй байлга`;

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
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not set");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Хэт олон хүсэлт илгээлээ. Түр хүлээнэ үү." }), {
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

    const data = await response.json();

    return new Response(
      JSON.stringify({ reply: data.choices[0].message.content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
