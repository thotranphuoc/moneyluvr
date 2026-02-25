-- MoneyLuvr: Tạo bảng và RLS cho Supabase
-- Chạy toàn bộ script này trong Supabase Dashboard → SQL Editor → New query

-- 1. Bảng categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Bảng wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wallets"
  ON public.wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Bảng transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  wallet_id TEXT NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND' CHECK (currency IN ('VND', 'USD', 'SGD')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_wallet ON public.transactions(user_id, wallet_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Bảng budgets (unique: 1 budget per user, category, month)
CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_month
  ON public.budgets(user_id, category_id, month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Bảng user_preferences (đồng bộ theme, ngôn ngữ, đơn vị tiền tệ giữa các thiết bị)
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

-- Trigger: cập nhật updated_at khi sửa transaction (tùy chọn)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Migration: cho phép đơn vị tiền tệ tùy chỉnh (JPY, EUR, ...)
-- Chạy đoạn sau nếu bạn đã tạo bảng transactions với CHECK cũ:
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_currency_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_currency_check
  CHECK (currency ~ '^[A-Z]{2,5}$');
