import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { SummaryTable } from '@/components/SummaryTable';
import { useTicketStore } from '@/hooks/useTicketStore';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Download, DollarSign, Ticket, Package } from 'lucide-react';

const DailySummary = () => {
  const { boxes, resetDailyCounts, getTotals } = useTicketStore();
  const totals = getTotals();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    setIsExporting(true);
    
    const activeBoxes = boxes.filter(b => b.isConfigured && b.ticketsSold > 0);
    const csvContent = [
      ['Box #', 'Ticket Price', 'Last Ticket', 'Tickets Sold', 'Amount Sold'].join(','),
      ...activeBoxes.map(box => [
        box.boxNumber,
        `$${box.ticketPrice}`,
        box.lastScannedTicketNumber ?? '-',
        box.ticketsSold,
        `$${box.totalAmountSold.toFixed(2)}`
      ].join(',')),
      ['', '', '', '', ''],
      ['TOTAL', '', '', totals.totalTicketsSold, `$${totals.totalAmountSold.toFixed(2)}`].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scratch-off-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Daily Summary</h2>
            <p className="text-muted-foreground mt-1">
              End of day totals for {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting || totals.totalTicketsSold === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reset Day
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">Reset Daily Counts?</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    This will clear all ticket counts and amounts for today. 
                    Box configurations will be preserved. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetDailyCounts}>
                    Yes, Reset Counts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <Package className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Boxes</p>
              <p className="text-4xl font-bold text-foreground">{totals.activeBoxes}</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <Ticket className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
              <p className="text-4xl font-bold text-foreground">{totals.totalTicketsSold}</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="bg-success/10 rounded-xl p-4">
              <DollarSign className="w-10 h-10 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-4xl font-bold text-success">${totals.totalAmountSold.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <SummaryTable boxes={boxes} />
      </div>
    </Layout>
  );
};

export default DailySummary;
