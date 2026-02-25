-- Migration: Thêm bảng user_preferences (đồng bộ theme, ngôn ngữ, đơn vị tiền tệ giữa các thiết bị)
-- Chạy trong Supabase Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  primary_color TEXT NOT NULL DEFAULT '#0d9488',
  currency TEXT NOT NULL DEFAULT 'VND',
  currency_list JSONB NOT NULL DEFAULT '["VND","USD","SGD"]'::jsonb,
  language TEXT NOT NULL DEFAULT 'en'
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
