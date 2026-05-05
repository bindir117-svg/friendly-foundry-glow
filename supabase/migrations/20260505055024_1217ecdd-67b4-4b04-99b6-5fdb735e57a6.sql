-- Wipe intermediate content first
DELETE FROM public.quiz_attempts WHERE level = 'intermediate';
DELETE FROM public.quiz_questions WHERE level = 'intermediate';
DELETE FROM public.lesson_progress WHERE lesson_id IN (SELECT id FROM public.lessons WHERE level='intermediate');
DELETE FROM public.lessons WHERE level = 'intermediate';

-- Insert 30 lessons (content loaded via migration tool from generated file)
-- See migration content below
