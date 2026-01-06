import { TicketBox } from '@/types/ticket';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SummaryTableProps {
  boxes: TicketBox[];
}

export const SummaryTable = ({ boxes }: SummaryTableProps) => {
  const activeBoxes = boxes.filter(b => b.isConfigured && b.ticketsSold > 0);
  const totalTickets = activeBoxes.reduce((sum, b) => sum + b.ticketsSold, 0);
  const totalAmount = activeBoxes.reduce((sum, b) => sum + b.totalAmountSold, 0);

  if (activeBoxes.length === 0) {
    return (
      <div className="bg-muted/50 border-2 border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-xl text-muted-foreground">
          No tickets sold yet today. Start scanning!
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
          {activeBoxes.map(box => (
            <TableRow key={box.boxNumber} className="text-lg">
              <TableCell className="font-bold">Box {box.boxNumber}</TableCell>
              <TableCell className="text-right">${box.ticketPrice}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                #{box.lastScannedTicketNumber ?? '-'}
              </TableCell>
              <TableCell className="text-right font-semibold">{box.ticketsSold}</TableCell>
              <TableCell className="text-right font-bold text-success">
                ${box.totalAmountSold.toFixed(2)}
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
