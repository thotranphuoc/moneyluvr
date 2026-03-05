-- Nghi lễ Thu hoạch (3C): lưu đã show popup theo tháng để sync giữa thiết bị
CREATE TABLE IF NOT EXISTS public.user_harvest_shown (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_user_harvest_shown_user_id ON public.user_harvest_shown(user_id);

ALTER TABLE public.user_harvest_shown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own harvest_shown"
  ON public.user_harvest_shown FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
