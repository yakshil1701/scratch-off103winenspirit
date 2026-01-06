export interface TicketBox {
  id: number;
  boxNumber: number;
  ticketPrice: number;
  totalTicketsPerBook: number;
  startingTicketNumber: number;
  lastScannedTicketNumber: number | null;
  ticketsSold: number;
  totalAmountSold: number;
  isConfigured: boolean;
}

export interface ScanResult {
  success: boolean;
  boxNumber: number;
  ticketNumber: number;
  ticketsSold: number;
  amountSold: number;
  message: string;
  timestamp: Date;
}

export interface ScanError {
  type: 'invalid_barcode' | 'duplicate_scan' | 'invalid_sequence' | 'exceeds_book' | 'box_not_configured';
  message: string;
}
