import { ScanResult } from '@/types/ticket';
import { Clock } from 'lucide-react';

interface ScanHistoryProps {
  history: ScanResult[];
}

export const ScanHistory = ({ history }: ScanHistoryProps) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Recent Scans</h3>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.slice(0, 10).map((scan, index) => (
          <div 
            key={index}
            className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg text-sm"
          >
            <div className="flex items-center gap-4">
              <span className="font-bold text-foreground">Box {scan.boxNumber}</span>
              <span className="text-muted-foreground">Ticket #{scan.ticketNumber}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{scan.ticketsSold} sold</span>
              <span className="font-semibold text-success">${scan.amountSold.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
