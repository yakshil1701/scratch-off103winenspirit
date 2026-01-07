export interface DailySummary {
  id: string;
  summary_date: string;
  day_of_week: string;
  total_tickets_sold: number;
  total_amount_sold: number;
  active_boxes: number;
  created_at: string;
  updated_at: string;
}

export interface DailyBoxSale {
  id: string;
  summary_id: string;
  box_number: number;
  ticket_price: number;
  last_scanned_ticket_number: number | null;
  tickets_sold: number;
  total_amount_sold: number;
  created_at: string;
  updated_at: string;
}

export interface HistoricalSummaryData {
  summary: DailySummary;
  boxSales: DailyBoxSale[];
}
