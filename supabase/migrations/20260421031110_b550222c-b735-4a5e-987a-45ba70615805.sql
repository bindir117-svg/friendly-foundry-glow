-- Quiz questions: AI-generated per level, linked to lesson for review
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  explanation text DEFAULT '',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view quiz" ON public.quiz_questions FOR SELECT TO authenticated USING (true);

-- Quiz attempts (each completed exam)
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level text NOT NULL,
  score int NOT NULL,
  total int NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  wrong_lesson_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all attempts" ON public.quiz_attempts FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Notes: bg color
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS bg_color text NOT NULL DEFAULT '#0a0a0a';

CREATE INDEX idx_quiz_questions_level ON public.quiz_questions(level, order_index);
CREATE INDEX idx_quiz_attempts_user_level ON public.quiz_attempts(user_id, level, created_at DESC);