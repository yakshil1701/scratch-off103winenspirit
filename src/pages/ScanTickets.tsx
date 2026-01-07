import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { ScanInput } from '@/components/ScanInput';
import { BoxSelector } from '@/components/BoxSelector';
import { ScanFeedback } from '@/components/ScanFeedback';
import { ScanHistory } from '@/components/ScanHistory';
import { useTicketStore } from '@/hooks/useTicketStore';
import { DollarSign, Ticket } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ScanTickets = () => {
  const { boxes, processBarcode, scanHistory, lastScanResult, lastError, getTotals } = useTicketStore();
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const totals = getTotals();

  const configuredBoxes = boxes.filter(b => b.isConfigured).sort((a, b) => a.boxNumber - b.boxNumber);

  const getNextBox = useCallback((currentBox: number): number | null => {
    const currentIndex = configuredBoxes.findIndex(b => b.boxNumber === currentBox);
    if (currentIndex === -1 || currentIndex >= configuredBoxes.length - 1) {
      return null; // No next box available
    }
    return configuredBoxes[currentIndex + 1].boxNumber;
  }, [configuredBoxes]);

  const handleScan = (barcode: string) => {
    if (selectedBox === null) {
      return;
    }
    const { result } = processBarcode(barcode, selectedBox);
    
    // Auto-advance only on successful scan
    if (autoAdvance && result?.success) {
      const nextBox = getNextBox(selectedBox);
      if (nextBox !== null) {
        setSelectedBox(nextBox);
      }
    }
  };

  const selectedBoxData = boxes.find(b => b.boxNumber === selectedBox);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-3">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
              <p className="text-3xl font-bold text-foreground">{totals.totalTicketsSold}</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="bg-success/10 rounded-xl p-3">
              <DollarSign className="w-8 h-8 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-success">${totals.totalAmountSold.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Box Selector */}
        <div className="stat-card">
          <BoxSelector
            boxes={boxes}
            selectedBox={selectedBox}
            onSelect={setSelectedBox}
          />
          
          {/* Auto-advance toggle */}
          {configuredBoxes.length > 1 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <Switch
                id="auto-advance"
                checked={autoAdvance}
                onCheckedChange={setAutoAdvance}
              />
              <Label htmlFor="auto-advance" className="text-sm text-muted-foreground cursor-pointer">
                Auto-advance to next box after successful scan
              </Label>
            </div>
          )}
        </div>

        {/* Selected Box Info */}
        {selectedBoxData && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Scanning</p>
                <p className="text-xl font-bold text-foreground">
                  Box {selectedBox} · ${selectedBoxData.ticketPrice} tickets
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Sold Today</p>
                <p className="text-xl font-bold text-success">
                  {selectedBoxData.ticketsSold} tickets · ${selectedBoxData.totalAmountSold.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Input */}
        <div className="stat-card">
          <label className="block text-sm font-semibold text-muted-foreground mb-3">
            Barcode Scanner Input
          </label>
          <ScanInput
            onScan={handleScan}
            disabled={selectedBox === null}
          />
          {selectedBox === null && (
            <p className="text-sm text-warning mt-2">
              ⚠️ Select a box above before scanning
            </p>
          )}
        </div>

        {/* Scan Feedback */}
        <ScanFeedback result={lastScanResult} error={lastError} />

        {/* Scan History */}
        <ScanHistory history={scanHistory} />
      </div>
    </Layout>
  );
};

export default ScanTickets;
