-- Create user_settings table for cross-device settings sync
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL DEFAULT 'MD',
  ticket_order TEXT NOT NULL DEFAULT 'descending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create game_registry table for cross-device game info sync
CREATE TABLE public.game_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL DEFAULT 'MD',
  game_number TEXT NOT NULL,
  ticket_price NUMERIC NOT NULL,
  total_tickets_per_book INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, state_code, game_number)
);

-- Create box_configurations table for cross-device box sync
CREATE TABLE public.box_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL DEFAULT 'MD',
  box_number INTEGER NOT NULL,
  ticket_price NUMERIC NOT NULL DEFAULT 0,
  total_tickets_per_book INTEGER NOT NULL DEFAULT 0,
  starting_ticket_number INTEGER NOT NULL DEFAULT 0,
  last_scanned_ticket_number INTEGER,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  game_number TEXT,
  book_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, state_code, box_number)
);

-- Create daily_scanning_state table for current day's scanning progress
CREATE TABLE public.daily_scanning_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL DEFAULT 'MD',
  business_date DATE NOT NULL DEFAULT CURRENT_DATE,
  box_number INTEGER NOT NULL,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  total_amount_sold NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, state_code, business_date, box_number)
);

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_scanning_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for game_registry
CREATE POLICY "Users can view own games"
  ON public.game_registry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
  ON public.game_registry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON public.game_registry FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON public.game_registry FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for box_configurations
CREATE POLICY "Users can view own boxes"
  ON public.box_configurations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boxes"
  ON public.box_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boxes"
  ON public.box_configurations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boxes"
  ON public.box_configurations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for daily_scanning_state
CREATE POLICY "Users can view own scanning state"
  ON public.daily_scanning_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scanning state"
  ON public.daily_scanning_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scanning state"
  ON public.daily_scanning_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scanning state"
  ON public.daily_scanning_state FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_game_registry_user_state ON public.game_registry(user_id, state_code);
CREATE INDEX idx_box_configurations_user_state ON public.box_configurations(user_id, state_code);
CREATE INDEX idx_daily_scanning_state_user_date ON public.daily_scanning_state(user_id, state_code, business_date);

-- Add triggers for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_registry_updated_at
  BEFORE UPDATE ON public.game_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_box_configurations_updated_at
  BEFORE UPDATE ON public.box_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_scanning_state_updated_at
  BEFORE UPDATE ON public.daily_scanning_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();