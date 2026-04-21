import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_LEVELS = ["beginner", "intermediate", "advanced"];
const QUESTIONS_PER_LEVEL = 26;

const LEVEL_FOCUS: Record<string, string> = {
  beginner: "Forex үндэс, валют хос, pip, lot, leverage, candlestick, timeframe, market hours, MT4/MT5, spread, broker, swap",
  intermediate: "Техникийн анализ, support/resistance, trendline, MA, RSI, MACD, Fibonacci, мөнгө удирдлага, R/R, position sizing, risk %, trading psychology, journaling",
  advanced: "Price Action, Smart Money Concepts (SMC), Order Block, Fair Value Gap, BOS/CHOCH, liquidity, MTF analysis, supply/demand, harmonic patterns, advanced risk management, hedging",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // AUTH
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Нэвтрэх шаардлагатай." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: u, error: ue } = await supabase.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "Нэвтрэх шаардлагатай." }, 401);

    const { level } = await req.json();
    if (!VALID_LEVELS.includes(level)) return json({ error: "Буруу түвшин." }, 400);

    // If questions exist already → just return them
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const existing = await service
      .from("quiz_questions")
      .select("id")
      .eq("level", level)
      .limit(1);
    if ((existing.data?.length ?? 0) > 0) {
      return json({ ok: true, generated: false });
    }

    // Fetch lessons for this level (so we can map questions back for review)
    const { data: lessons } = await service
      .from("lessons")
      .select("id, title")
      .eq("level", level)
      .order("order_index", { ascending: true });

    const lessonList = (lessons ?? []).map((l, i) => `${i + 1}. ${l.title} [id:${l.id}]`).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Үйлчилгээ түр ажиллахгүй." }, 500);

    const sysPrompt = `Чи Forex сургалтын мэргэжилтэн. Монгол хэл дээр ${QUESTIONS_PER_LEVEL} ширхэг multiple-choice асуулт бэлтгэ. Сэдэв: ${LEVEL_FOCUS[level]}. Хариулт бүрд 4 сонголт байх ёстой. Зөвхөн нэг зөв хариулт байна. Асуулт бүрийг боломжтой бол доорх хичээлийн нэгтэй холбож "lesson_id" талбарт оноож өг (хичээлийн жагсаалтаас сонгоно):\n\n${lessonList || "(хичээл байхгүй)"}\n\nТовч, тодорхой бич. Хариултыг tool call-р буцаа.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `${QUESTIONS_PER_LEVEL} асуулт үүсгэ. Хүндийн зэрэг холимог.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_questions",
            description: "Save quiz questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correct_index: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                      lesson_id: { type: "string", description: "uuid of related lesson or empty" },
                    },
                    required: ["question", "options", "correct_index", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_questions" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("ai err", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Хэт олон хүсэлт." }, 429);
      if (aiResp.status === 402) return json({ error: "Кредит дууссан." }, 402);
      return json({ error: "Quiz үүсгэж чадсангүй." }, 500);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "Quiz формат буруу." }, 500);

    let parsed: any;
    try { parsed = JSON.parse(args); } catch { return json({ error: "Quiz parse алдаа." }, 500); }
    const qs = (parsed?.questions ?? []) as any[];
    if (qs.length === 0) return json({ error: "Quiz хоосон." }, 500);

    const validLessonIds = new Set((lessons ?? []).map((l) => l.id));
    const rows = qs.slice(0, QUESTIONS_PER_LEVEL).map((q, i) => ({
      level,
      question: String(q.question ?? "").slice(0, 600),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o).slice(0, 200)) : [],
      correct_index: Math.max(0, Math.min(3, Number(q.correct_index ?? 0))),
      explanation: String(q.explanation ?? "").slice(0, 800),
      lesson_id: q.lesson_id && validLessonIds.has(q.lesson_id) ? q.lesson_id : null,
      order_index: i,
    })).filter((r) => r.options.length === 4 && r.question.length > 0);

    if (rows.length === 0) return json({ error: "Quiz бүтэлгүйтсэн." }, 500);

    const ins = await service.from("quiz_questions").insert(rows);
    if (ins.error) {
      console.error("insert err", ins.error);
      return json({ error: "Хадгалж чадсангүй." }, 500);
    }

    return json({ ok: true, generated: true, count: rows.length });
  } catch (e) {
    console.error("generate-quiz error", e);
    return json({ error: "Дотоод алдаа." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
