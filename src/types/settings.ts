export type StateCode = 'MD' | 'DC';
export type TicketOrder = 'descending' | 'ascending';

export interface StoreSettings {
  stateCode: StateCode;
  ticketOrder: TicketOrder;
}

export const STATE_OPTIONS: { value: StateCode; label: string }[] = [
  { value: 'MD', label: 'Maryland' },
  { value: 'DC', label: 'Washington DC' },
];

export const TICKET_ORDER_OPTIONS: { value: TicketOrder; label: string; description: string }[] = [
  { value: 'descending', label: 'Descending', description: 'Tickets count down (60, 59, 58...)' },
  { value: 'ascending', label: 'Ascending', description: 'Tickets count up (1, 2, 3...)' },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  stateCode: 'MD',
  ticketOrder: 'descending',
};
