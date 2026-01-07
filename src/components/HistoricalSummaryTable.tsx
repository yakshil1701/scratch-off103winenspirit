import { DailyBoxSale } from '@/types/summary';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface HistoricalSummaryTableProps {
  boxSales: DailyBoxSale[];
  isEditMode: boolean;
  onUpdateSale?: (boxNumber: number, updates: Partial<DailyBoxSale>) => void;
}

export const HistoricalSummaryTable = ({
  boxSales,
  isEditMode,
  onUpdateSale,
}: HistoricalSummaryTableProps) => {
  const totalTickets = boxSales.reduce((sum, b) => sum + b.tickets_sold, 0);
  const totalAmount = boxSales.reduce((sum, b) => sum + b.total_amount_sold, 0);

  if (boxSales.length === 0) {
    return (
      <div className="bg-muted/50 border-2 border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-xl text-muted-foreground">
          No sales recorded for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="stat-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold text-foreground">Box #</TableHead>
            <TableHead className="font-bold text-foreground text-right">Price</TableHead>
            <TableHead className="font-bold text-foreground text-right">Last Ticket</TableHead>
            <TableHead className="font-bold text-foreground text-right">Tickets Sold</TableHead>
            <TableHead className="font-bold text-foreground text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boxSales.map(sale => (
            <TableRow key={sale.id} className="text-lg">
              <TableCell className="font-bold">Box {sale.box_number}</TableCell>
              <TableCell className="text-right">${sale.ticket_price}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {isEditMode ? (
                  <Input
                    type="number"
                    value={sale.last_scanned_ticket_number ?? ''}
                    onChange={(e) => onUpdateSale?.(sale.box_number, { 
                      last_scanned_ticket_number: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-20 text-right ml-auto"
                  />
                ) : (
                  `#${sale.last_scanned_ticket_number ?? '-'}`
                )}
              </TableCell>
              <TableCell className="text-right">
                {isEditMode ? (
                  <Input
                    type="number"
                    value={sale.tickets_sold}
                    onChange={(e) => onUpdateSale?.(sale.box_number, { 
                      tickets_sold: parseInt(e.target.value) || 0 
                    })}
                    className="w-20 text-right ml-auto"
                    min={0}
                  />
                ) : (
                  <span className="font-semibold">{sale.tickets_sold}</span>
                )}
              </TableCell>
              <TableCell className="text-right font-bold text-success">
                ${sale.total_amount_sold.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-primary/5 border-t-2 border-primary">
            <TableCell colSpan={3} className="font-bold text-lg text-foreground">
              STORE TOTAL
            </TableCell>
            <TableCell className="text-right font-bold text-lg">
              {totalTickets}
            </TableCell>
            <TableCell className="text-right font-bold text-xl text-success">
              ${totalAmount.toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
