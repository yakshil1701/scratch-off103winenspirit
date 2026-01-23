-- Add state_code column to daily_summaries table
ALTER TABLE public.daily_summaries 
ADD COLUMN state_code TEXT NOT NULL DEFAULT 'MD';

-- Add state_code column to daily_box_sales table
ALTER TABLE public.daily_box_sales 
ADD COLUMN state_code TEXT NOT NULL DEFAULT 'MD';

-- Create index for faster queries by state
CREATE INDEX idx_daily_summaries_state_code ON public.daily_summaries(state_code);
CREATE INDEX idx_daily_box_sales_state_code ON public.daily_box_sales(state_code);

-- Update the unique constraint on daily_summaries to include state_code
-- First drop existing constraint if any (summary_date should be unique per state)
ALTER TABLE public.daily_summaries 
DROP CONSTRAINT IF EXISTS daily_summaries_summary_date_key;

-- Add new unique constraint for date + state combination
ALTER TABLE public.daily_summaries 
ADD CONSTRAINT daily_summaries_date_state_unique UNIQUE (summary_date, state_code);