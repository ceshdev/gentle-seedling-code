CREATE POLICY "Products can be inserted publicly"
  ON public.products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Products can be updated publicly"
  ON public.products FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Products can be deleted publicly"
  ON public.products FOR DELETE
  USING (true);

GRANT INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;