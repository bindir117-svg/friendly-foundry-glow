
-- 1) avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2) notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Тэмдэглэл',
  content TEXT NOT NULL DEFAULT '',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notes" ON public.notes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view lessons" ON public.lessons FOR SELECT TO authenticated USING (true);

-- 4) lesson_progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all progress" ON public.lesson_progress FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) generated_images history
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own images" ON public.generated_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own images" ON public.generated_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own images" ON public.generated_images FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all images" ON public.generated_images FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 6) Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('note-attachments', 'note-attachments', false) ON CONFLICT (id) DO NOTHING;

-- avatars: public read, owner write (folder = user_id)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- chat-uploads: private, owner + admin
CREATE POLICY "Users view own chat uploads" ON storage.objects FOR SELECT USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all chat uploads" ON storage.objects FOR SELECT USING (bucket_id = 'chat-uploads' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users upload own chat files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own chat files" ON storage.objects FOR DELETE USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- note-attachments: private, owner + admin
CREATE POLICY "Users view own note files" ON storage.objects FOR SELECT USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all note files" ON storage.objects FOR SELECT USING (bucket_id = 'note-attachments' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users upload own note files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own note files" ON storage.objects FOR DELETE USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7) Seed lessons
INSERT INTO public.lessons (level, title, description, content, order_index) VALUES
('beginner', 'Forex гэж юу вэ?', 'Валютын зах зээлийн үндсэн ойлголт', '# Forex гэж юу вэ?

Forex (Foreign Exchange) бол дэлхийн хамгийн том санхүүгийн зах зээл. Өдөрт **6 их наяд доллар** эргэлддэг.

## Үндсэн ойлголт
- Валютын **хосоор** арилждаг (EUR/USD, GBP/USD гэх мэт)
- Эхний валют = base, хоёр дахь = quote
- Жишээ: EUR/USD = 1.1000 → 1 EUR = 1.10 USD

## Яагаад хүмүүс Forex хийдэг вэ?
- 24/5 нээлттэй
- Бага капиталтай эхэлж болно (leverage)
- Хоёр чиглэлд ашиг олно (Buy эсвэл Sell)

⚠️ **Анхаар:** Forex эрсдэлтэй. Эхлээд demo дээр сайн дадлагажиж байж real руу ор.', 1),

('beginner', 'Candlestick (лаа) уншлага', 'Үнийн хөдөлгөөнийг хэрхэн уншихыг сурах', '# Candlestick уншлага

Лаа (candle) нь тодорхой хугацаанд үнэ хэрхэн өөрчлөгдсөнийг харуулна.

## Лааны бүтэц
- **Бие (body):** Open болон Close хоорондын зай
- **Сүүл (wick):** High болон Low үнэ
- **Ногоон (bullish):** Close > Open (үнэ өссөн)
- **Улаан (bearish):** Close < Open (үнэ буурсан)

## Чухал хэлбэрүүд
1. **Doji** — Open ≈ Close. Тодорхойгүй байдал
2. **Hammer** — Урт доод сүүл. Доош хандлага дуусч магадгүй
3. **Engulfing** — Том лаа өмнөх лааг "залгисан". Хүчтэй эргэлт

💡 Лаа уншиж сурвал зах зээлийн сэтгэл хөдлөлийг ойлгож эхэлнэ.', 2),

('beginner', 'Lot, Pip, Leverage', 'Position size болон эрсдэлийн үндэс', '# Lot, Pip, Leverage

## Pip
- Үнийн хамгийн жижиг өөрчлөлт
- Ихэнх хосуудад **0.0001** (4 дэх орон)
- JPY хосуудад **0.01**

## Lot
- **Standard lot:** 100,000 нэгж
- **Mini lot:** 10,000 нэгж (0.1)
- **Micro lot:** 1,000 нэгж (0.01)

## Leverage (хөшүүрэг)
- 1:100 leverage = $100-аар $10,000-ийн арилжаа
- **Эрсдэлтэй!** Ашиг ч, алдагдал ч 100 дахин нэмэгдэнэ

⚠️ Эхлээд **1:10 эсвэл 1:30** leverage-аар л дадлагаж.', 3),

('intermediate', 'Support & Resistance', 'Үнийн чухал түвшинг тодорхойлох', '# Support & Resistance

Зах зээлийн **хамгийн чухал** ойлголт.

## Support (тулгуур)
- Үнэ доош ороход **зогсоодог** түвшин
- Худалдан авагчид олноороо орж ирдэг газар

## Resistance (саад)
- Үнэ дээш гарахад **зогсоодог** түвшин
- Худалдагчид олноороо орж ирдэг газар

## Хэрхэн зурах вэ?
1. Higher TF дээр (H4, D1) хар
2. Үнэ **2+ удаа** мөргөсөн газрыг тэмдэглэ
3. Wicks-ийг бус, **closing price**-ийг ажигла

## Арилжааны санаа
- Support дээр **Buy** (SL доор нь)
- Resistance дээр **Sell** (SL дээр нь)
- **Breakout** болвол шинэ чиглэлд ор', 1),

('intermediate', 'Moving Average & RSI', 'Хамгийн түгээмэл индикаторууд', '# MA & RSI

## Moving Average (MA)
Сүүлийн N лааны дундаж үнэ.
- **MA 50** богино хугацааны trend
- **MA 200** урт хугацааны trend
- Үнэ MA-ийн дээр → uptrend
- Үнэ MA-ийн доор → downtrend

## RSI (Relative Strength Index)
0-100 хооронд хэлбэлздэг momentum индикатор.
- **>70** = overbought (хэт өссөн)
- **<30** = oversold (хэт буурсан)
- **Divergence** = үнэ шинэ high/low хийж байгаа ч RSI хийхгүй → эргэлт магадгүй

💡 Дан индикатор бүү итгэ. Price action-той хослуул.', 2),

('intermediate', 'Risk Management', 'Капиталаа хамгаалах урлаг', '# Risk Management

**Хамгийн чухал** хичээл. Үүнийг сураагүй бол данс шатна.

## 1% Rule
Нэг арилжаанд **дансныхаа 1%-аас** илүү эрсдэлд бүү оруул.
- $1,000 данс → $10-аас илүү алдаж болохгүй

## Risk/Reward Ratio
- Хамгийн багадаа **1:2** (1 алдаад 2 авна)
- Жишээ: 50 pip SL, 100 pip TP

## Position Size томъёо
```
Lot size = (Account × Risk%) / (SL pip × Pip value)
```

## Хатуу дүрэм
- ✅ Stop Loss заавал тавь
- ❌ Алдсаныг "нөхөх" гэж lot нэмж бүү ор (revenge trading)
- ❌ Нэг арилжаанд бүх мөнгөө бүү тавь', 3),

('advanced', 'Smart Money Concepts (SMC)', 'Институционал арилжааны үндэс', '# Smart Money Concepts

Том тоглогчид (банк, hedge fund) хэрхэн арилждагийг ойлгох.

## Үндсэн ойлголтууд

### BOS (Break of Structure)
- Trend үргэлжилж байгааг батлах signal
- Uptrend-д шинэ HH, downtrend-д шинэ LL

### CHOCH (Change of Character)
- Trend эргэх анхны signal
- Uptrend-д LL үүсэх, downtrend-д HH үүсэх

### Order Block (OB)
- Институционал захиалга байсан газар
- Хүчтэй хөдөлгөөний өмнөх **сүүлчийн opposite candle**

### Liquidity
- Stop loss-ууд хуримтлагдсан газар
- Equal highs/lows = liquidity pool
- Smart money эдгээрийг **цэвэрлэдэг**

💡 Retail trader: support/resistance дагана. Smart money: liquidity-г агнадаг.', 1),

('advanced', 'Fair Value Gap (FVG)', 'Imbalance буюу үнийн зайг ашиглах', '# Fair Value Gap

FVG = үнэ хэт хурдан явснаас үүсэх **3 лаа дундах зай**.

## Хэрхэн таних вэ?
1. Лаа №1 ба №3 -ийн **wicks хүрэлцэхгүй** байна
2. Дунд лаа том хүчтэй (impulsive)
3. Дунд лаа дээр hover хийсэн зай = FVG

## Bullish FVG
- Лаа №1-ийн **High** ба Лаа №3-ийн **Low** дунд зай
- Үнэ эргэж дүүргэх хандлагатай → Buy entry

## Bearish FVG
- Лаа №1-ийн **Low** ба Лаа №3-ийн **High** дунд зай
- Үнэ эргэж дүүргэх хандлагатай → Sell entry

## Combo стратеги
**FVG + Order Block + BOS** = high probability setup

⚠️ Бүх FVG дүүрдэггүй. Higher TF bias-тай нийлүүл.', 2),

('advanced', 'Multi-Timeframe Analysis (MTF)', 'Олон TF-г нэгтгэн шинжлэх', '# Multi-Timeframe Analysis

Нэг TF дээр л харах = талыг нь л харж байна.

## Top-Down approach

### 1. Bias TF (D1, W1)
- Ерөнхий чиглэл: bullish уу, bearish уу?
- Зөвхөн энэ чиглэлд арилжаа хий

### 2. Structure TF (H4, H1)
- BOS, CHOCH, key zones тодорхойлно
- Орох талбар (zone) сонгоно

### 3. Entry TF (M15, M5)
- Нарийн entry (FVG, OB rejection)
- Stop Loss байрлуулах

## Жишээ workflow
1. **D1:** Uptrend (HH, HL)
2. **H4:** Resistance дээр sweep + CHOCH ↓
3. **H1:** Bearish OB үүссэн
4. **M15:** OB-д хүрч bearish FVG → **Sell entry**

💡 Бүх TF нэг чиглэл рүү байх ёсгүй. Гэхдээ entry чиглэл bias-тай зөрчилдөх ёсгүй.', 3);
