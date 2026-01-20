// Global game registry - stores price and tickets per book for each game
export interface GameInfo {
  gameNumber: string;
  ticketPrice: number;
  totalTicketsPerBook: number;
}

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
  // Game/Book tracking fields
  gameNumber: string | null;
  bookNumber: string | null;
}

export interface ScanResult {
  success: boolean;
  boxNumber: number;
  ticketNumber: number;
  ticketsSold: number;
  amountSold: number;
  message: string;
  timestamp: Date;
  // Optional game/book info
  gameNumber?: string;
  bookNumber?: string;
  bookTransition?: boolean; // True if this scan triggered a new book
}

export interface ScanError {
  type: 'invalid_barcode' | 'duplicate_scan' | 'invalid_sequence' | 'exceeds_book' | 'box_not_configured' | 'unknown_game';
  message: string;
}
