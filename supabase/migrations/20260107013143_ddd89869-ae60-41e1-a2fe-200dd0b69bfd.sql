-- Create table for daily summaries
CREATE TABLE public.daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  day_of_week TEXT NOT NULL,
  total_tickets_sold INTEGER NOT NULL DEFAULT 0,
  total_amount_sold DECIMAL(10,2) NOT NULL DEFAULT 0,
  active_boxes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for box sales per day
CREATE TABLE public.daily_box_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES public.daily_summaries(id) ON DELETE CASCADE,
  box_number INTEGER NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  last_scanned_ticket_number INTEGER,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  total_amount_sold DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(summary_id, box_number)
);

-- Enable RLS
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_box_sales ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-store use, no login required as per spec)
CREATE POLICY "Allow public read access on daily_summaries" 
ON public.daily_summaries 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on daily_summaries" 
ON public.daily_summaries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on daily_summaries" 
ON public.daily_summaries 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public read access on daily_box_sales" 
ON public.daily_box_sales 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on daily_box_sales" 
ON public.daily_box_sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on daily_box_sales" 
ON public.daily_box_sales 
FOR UPDATE 
USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_daily_summaries_date ON public.daily_summaries(summary_date DESC);
CREATE INDEX idx_daily_summaries_day_of_week ON public.daily_summaries(day_of_week);
CREATE INDEX idx_daily_box_sales_summary_id ON public.daily_box_sales(summary_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_box_sales_updated_at
BEFORE UPDATE ON public.daily_box_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();