-- Allow admins to manage lessons
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grants for lessons (admin write needs INSERT/UPDATE/DELETE)
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;