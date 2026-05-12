
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_asset_type TEXT NOT NULL DEFAULT 'Forex',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'Forex',
  trade_type TEXT NOT NULL CHECK (trade_type IN ('Long','Short')),
  lot_size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ NOT NULL,
  pnl NUMERIC NOT NULL DEFAULT 0,
  pnl_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Breakeven',
  setup TEXT,
  mistake TEXT,
  emotional_state TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX trades_user_entry_idx ON public.trades(user_id, entry_time DESC);

-- AI chat messages
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own chat" ON public.ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chat" ON public.ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chat" ON public.ai_chat_messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX ai_chat_user_idx ON public.ai_chat_messages(user_id, created_at);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trades_updated_at BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
