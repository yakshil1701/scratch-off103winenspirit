import { ScanResult, ScanError } from '@/types/ticket';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ScanFeedbackProps {
  result: ScanResult | null;
  error: ScanError | null;
}

export const ScanFeedback = ({ result, error }: ScanFeedbackProps) => {
  if (error) {
    return (
      <div className="bg-destructive/10 border-2 border-destructive rounded-xl p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {error.type === 'exceeds_book' ? (
              <AlertTriangle className="w-12 h-12 text-warning" />
            ) : (
              <XCircle className="w-12 h-12 text-destructive" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-destructive mb-1">
              {error.type === 'invalid_barcode' && 'Invalid Barcode'}
              {error.type === 'duplicate_scan' && 'Duplicate Scan'}
              {error.type === 'invalid_sequence' && 'Invalid Sequence'}
              {error.type === 'exceeds_book' && 'Exceeds Book Total'}
              {error.type === 'box_not_configured' && 'Box Not Configured'}
            </h3>
            <p className="text-lg text-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="bg-success/10 border-2 border-success rounded-xl p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-success mb-2">Scan Successful!</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Box</p>
                <p className="text-2xl font-bold text-foreground">#{result.boxNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket #</p>
                <p className="text-2xl font-bold text-foreground">{result.ticketNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
                <p className="text-2xl font-bold text-foreground">{result.ticketsSold}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-success">${result.amountSold.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border-2 border-dashed border-border rounded-xl p-8 text-center">
      <p className="text-xl text-muted-foreground">
        Scan a ticket barcode to see results here
      </p>
    </div>
  );
};
