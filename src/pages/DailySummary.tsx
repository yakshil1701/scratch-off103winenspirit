import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { SummaryTable } from '@/components/SummaryTable';
import { HistoricalSummaryTable } from '@/components/HistoricalSummaryTable';
import { SummaryDateFilter } from '@/components/SummaryDateFilter';
import { HistoricalBanner } from '@/components/HistoricalBanner';
import { useTicketStore } from '@/hooks/useTicketStore';
import { useSummaryHistory } from '@/hooks/useSummaryHistory';
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
import { RefreshCw, Download, DollarSign, Ticket, Package, History } from 'lucide-react';
import { toast } from 'sonner';

const DailySummary = () => {
  const { boxes, resetDailyCounts, getTotals } = useTicketStore();
  const {
    historicalSummaries,
    selectedHistoricalData,
    isLoading,
    isEditMode,
    editedBoxSales,
    fetchSummaryList,
    fetchHistoricalSummary,
    saveDailySummary,
    enterEditMode,
    cancelEditMode,
    updateEditedBoxSale,
    saveHistoricalEdits,
    clearHistoricalSelection,
    getUniqueDaysOfWeek,
  } = useSummaryHistory();

  const totals = getTotals();
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch history list on mount
  useEffect(() => {
    fetchSummaryList();
  }, [fetchSummaryList]);

  const handleExportCSV = () => {
    setIsExporting(true);

    // Use historical data if viewing history, otherwise use today's data
    if (selectedHistoricalData) {
      const boxSales = isEditMode ? editedBoxSales : selectedHistoricalData.boxSales;
      const csvContent = [
        ['Date', selectedHistoricalData.summary.summary_date],
        ['Day', selectedHistoricalData.summary.day_of_week],
        [''],
        ['Box #', 'Ticket Price', 'Last Ticket', 'Tickets Sold', 'Amount Sold'].join(','),
        ...boxSales.map(sale => [
          sale.box_number,
          `$${sale.ticket_price}`,
          sale.last_scanned_ticket_number ?? '-',
          sale.tickets_sold,
          `$${sale.total_amount_sold.toFixed(2)}`
        ].join(',')),
        ['', '', '', '', ''],
        ['TOTAL', '', '', selectedHistoricalData.summary.total_tickets_sold, `$${selectedHistoricalData.summary.total_amount_sold.toFixed(2)}`].join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scratch-off-summary-${selectedHistoricalData.summary.summary_date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
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
    }

    setIsExporting(false);
  };

  const handleResetDay = async () => {
    // Save today's summary to history before resetting
    const result = await saveDailySummary(boxes);
    if (result.success) {
      resetDailyCounts();
      fetchSummaryList(); // Refresh history list
      toast.success('Day reset successfully. Summary saved to history.');
    } else {
      toast.error('Failed to save summary before reset.');
    }
  };

  const handleResetWithoutSaving = () => {
    resetDailyCounts();
    toast.success('Day reset successfully. No summary was saved.');
  };

  const handleSelectHistoricalDate = (date: string) => {
    fetchHistoricalSummary(date);
    setShowHistory(true);
  };

  const handleClearHistory = () => {
    clearHistoricalSelection();
    setShowHistory(false);
  };

  const handleSaveEdits = async () => {
    setIsSaving(true);
    const result = await saveHistoricalEdits();
    setIsSaving(false);
    if (result.success) {
      toast.success('Historical summary updated successfully.');
      fetchSummaryList(); // Refresh the list
    } else {
      toast.error(result.message);
    }
  };

  // Determine what to show: historical data or today's data
  const isViewingHistory = selectedHistoricalData !== null;
  const displayTotals = isViewingHistory
    ? {
        totalTicketsSold: selectedHistoricalData.summary.total_tickets_sold,
        totalAmountSold: selectedHistoricalData.summary.total_amount_sold,
        activeBoxes: selectedHistoricalData.summary.active_boxes,
      }
    : totals;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Daily Summary</h2>
            <p className="text-muted-foreground mt-1">
              {isViewingHistory
                ? `Historical data for ${selectedHistoricalData.summary.day_of_week}, ${new Date(selectedHistoricalData.summary.summary_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : `End of day totals for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Hide History' : 'View History'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting || (isViewingHistory ? displayTotals.totalTicketsSold === 0 : totals.totalTicketsSold === 0)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {!isViewingHistory && (
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
                      Choose how you want to reset the day. Box configurations will be preserved.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetWithoutSaving}
                      className="bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      Reset Without Saving
                    </AlertDialogAction>
                    <AlertDialogAction onClick={handleResetDay}>
                      Reset & Save
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* History Filters */}
        {showHistory && (
          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Summary History
            </h3>
            <SummaryDateFilter
              summaries={historicalSummaries}
              daysOfWeek={getUniqueDaysOfWeek()}
              onSelectDate={handleSelectHistoricalDate}
              onClearFilter={handleClearHistory}
              selectedDate={selectedHistoricalData?.summary.summary_date ?? null}
            />
            {historicalSummaries.length === 0 && !isLoading && (
              <p className="text-muted-foreground mt-3">
                No historical summaries yet. Complete a day and reset to save the first one.
              </p>
            )}
          </div>
        )}

        {/* Historical Banner */}
        {isViewingHistory && (
          <HistoricalBanner
            selectedDate={selectedHistoricalData.summary.summary_date}
            dayOfWeek={selectedHistoricalData.summary.day_of_week}
            isEditMode={isEditMode}
            onEnterEditMode={enterEditMode}
            onCancelEdit={cancelEditMode}
            onSaveEdits={handleSaveEdits}
            isSaving={isSaving}
          />
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <Package className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Boxes</p>
              <p className="text-4xl font-bold text-foreground">{displayTotals.activeBoxes}</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <Ticket className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
              <p className="text-4xl font-bold text-foreground">{displayTotals.totalTicketsSold}</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="bg-success/10 rounded-xl p-4">
              <DollarSign className="w-10 h-10 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-4xl font-bold text-success">${displayTotals.totalAmountSold.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        {isViewingHistory ? (
          <HistoricalSummaryTable
            boxSales={isEditMode ? editedBoxSales : selectedHistoricalData.boxSales}
            isEditMode={isEditMode}
            onUpdateSale={updateEditedBoxSale}
          />
        ) : (
          <SummaryTable boxes={boxes} />
        )}
      </div>
    </Layout>
  );
};

export default DailySummary;
