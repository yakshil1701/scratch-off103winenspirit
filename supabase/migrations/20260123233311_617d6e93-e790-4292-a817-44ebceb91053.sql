-- Add user_id column to daily_summaries
ALTER TABLE public.daily_summaries 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to daily_box_sales
ALTER TABLE public.daily_box_sales 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id columns
CREATE INDEX idx_daily_summaries_user_id ON public.daily_summaries(user_id);
CREATE INDEX idx_daily_box_sales_user_id ON public.daily_box_sales(user_id);

-- Drop existing RLS policies on daily_summaries
DROP POLICY IF EXISTS "Allow public delete on daily_summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Allow public insert on daily_summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Allow public read access on daily_summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Allow public update on daily_summaries" ON public.daily_summaries;

-- Drop existing RLS policies on daily_box_sales
DROP POLICY IF EXISTS "Allow public delete on daily_box_sales" ON public.daily_box_sales;
DROP POLICY IF EXISTS "Allow public insert on daily_box_sales" ON public.daily_box_sales;
DROP POLICY IF EXISTS "Allow public read access on daily_box_sales" ON public.daily_box_sales;
DROP POLICY IF EXISTS "Allow public update on daily_box_sales" ON public.daily_box_sales;

-- Create new user-specific RLS policies for daily_summaries
CREATE POLICY "Users can view own summaries"
ON public.daily_summaries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
ON public.daily_summaries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
ON public.daily_summaries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
ON public.daily_summaries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create new user-specific RLS policies for daily_box_sales
CREATE POLICY "Users can view own box sales"
ON public.daily_box_sales FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own box sales"
ON public.daily_box_sales FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own box sales"
ON public.daily_box_sales FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own box sales"
ON public.daily_box_sales FOR DELETE
TO authenticated
USING (auth.uid() = user_id);