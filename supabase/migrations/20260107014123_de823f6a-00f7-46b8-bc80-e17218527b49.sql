-- Add DELETE policies for both tables (permissive policies for public access)
-- This allows deletion while maintaining the same public access pattern

CREATE POLICY "Allow public delete on daily_summaries" 
ON public.daily_summaries FOR DELETE 
USING (true);

CREATE POLICY "Allow public delete on daily_box_sales" 
ON public.daily_box_sales FOR DELETE 
USING (true);