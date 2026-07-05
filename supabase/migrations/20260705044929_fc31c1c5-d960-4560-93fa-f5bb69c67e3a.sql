
-- 1) profiles XP columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- 2) lesson_progress xp
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS xp_earned integer NOT NULL DEFAULT 0;

-- 3) achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'trophy',
  xp_reward integer NOT NULL DEFAULT 0,
  condition_type text NOT NULL,
  condition_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements read all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "achievements admin write" ON public.achievements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua read own" ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ua insert own" ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5) pages
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  meta_description text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO authenticated, anon;
GRANT ALL ON public.pages TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.pages TO authenticated;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages read published" ON public.pages FOR SELECT USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pages admin write" ON public.pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pages_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) page_blocks
CREATE TABLE IF NOT EXISTS public.page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_blocks TO authenticated, anon;
GRANT ALL ON public.page_blocks TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks read all" ON public.page_blocks FOR SELECT USING (true);
CREATE POLICY "blocks admin write" ON public.page_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER page_blocks_updated_at BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS page_blocks_page_order_idx ON public.page_blocks(page_id, order_index);

-- 7) award_xp function
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer)
RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_xp integer;
  cur_level integer;
  next_xp integer;
  next_level integer;
BEGIN
  SELECT xp, level INTO cur_xp, cur_level FROM public.profiles WHERE user_id = _user_id;
  IF cur_xp IS NULL THEN
    cur_xp := 0; cur_level := 1;
  END IF;
  next_xp := cur_xp + GREATEST(_amount, 0);
  next_level := GREATEST(1, (next_xp / 100) + 1);
  UPDATE public.profiles
     SET xp = next_xp,
         level = next_level,
         last_active_date = CURRENT_DATE
   WHERE user_id = _user_id;
  RETURN QUERY SELECT next_xp, next_level, (next_level > cur_level);
END;
$$;

-- 8) storage.objects policies for page-assets
CREATE POLICY "page-assets public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'page-assets');
CREATE POLICY "page-assets admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'page-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page-assets admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'page-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page-assets admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'page-assets' AND public.has_role(auth.uid(), 'admin'));

-- 9) Seed a few default achievements
INSERT INTO public.achievements (code, title, description, icon, xp_reward, condition_type, condition_value)
VALUES
  ('first_lesson', 'Анхны алхам', 'Эхний хичээлээ дуусгасан', 'sparkles', 10, 'lessons_completed', 1),
  ('five_lessons', 'Тууштай сурагч', '5 хичээл дуусгасан', 'flame', 25, 'lessons_completed', 5),
  ('quiz_master', 'Quiz мастер', '10 quiz зөв хариулсан', 'brain', 30, 'quiz_correct', 10),
  ('level_5', 'Level 5', '5-р түвшинд хүрсэн', 'star', 50, 'level', 5)
ON CONFLICT (code) DO NOTHING;

-- 10) Seed the home page shell so admin has something to edit right away
INSERT INTO public.pages (slug, title, meta_description)
VALUES ('home', 'Нүүр', 'Тархиа сэргээх сургалтын платформ')
ON CONFLICT (slug) DO NOTHING;
