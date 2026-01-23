import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { ScanInput } from '@/components/ScanInput';
import { BoxSelector } from '@/components/BoxSelector';
import { ScanFeedback } from '@/components/ScanFeedback';
import { ScanHistory } from '@/components/ScanHistory';
import { StoreSettingsCard } from '@/components/StoreSettingsCard';
import { useTicketStore } from '@/hooks/useTicketStore';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { DollarSign, Ticket, Edit3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ScanTickets = () => {
  const { boxes, processBarcode, processManualEntry, scanHistory, lastScanResult, lastError, getTotals } = useTicketStore();
  const { settings, updateStateCode, updateTicketOrder } = useStoreSettings();
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualTicketNumber, setManualTicketNumber] = useState('');
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
    const { result } = processBarcode(barcode, selectedBox, settings.stateCode, settings.ticketOrder);
    
    // Auto-advance only on successful scan
    if (autoAdvance && result?.success) {
      const nextBox = getNextBox(selectedBox);
      if (nextBox !== null) {
        setSelectedBox(nextBox);
      }
    }
  };

  const handleManualEntry = () => {
    if (selectedBox === null) return;
    if (manualTicketNumber.length < 4) return;
    
    // Process manual entry exactly like a scanned barcode
    const { result } = processBarcode(manualTicketNumber, selectedBox, settings.stateCode, settings.ticketOrder);
    
    // Auto-advance only on successful entry
    if (autoAdvance && result?.success) {
      const nextBox = getNextBox(selectedBox);
      if (nextBox !== null) {
        setSelectedBox(nextBox);
      }
    }
    
    setManualEntryOpen(false);
    setManualTicketNumber('');
  };

  const selectedBoxData = boxes.find(b => b.boxNumber === selectedBox);

  // Check if settings can be changed (only when no sales data)
  const hasAnySales = boxes.some(b => b.ticketsSold > 0);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Store Settings */}
        <StoreSettingsCard
          settings={settings}
          onStateChange={updateStateCode}
          onTicketOrderChange={updateTicketOrder}
          disabled={hasAnySales}
        />

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
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-muted-foreground">
              Barcode Scanner Input
            </label>
            {selectedBox !== null && selectedBoxData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualEntryOpen(true)}
                className="gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Manual Entry
              </Button>
            )}
          </div>
          <ScanInput
            onScan={handleScan}
            disabled={selectedBox === null}
            stateCode={settings.stateCode}
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

        {/* Manual Entry Dialog */}
        <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manual Barcode Entry</DialogTitle>
              <DialogDescription>
                Enter the barcode value for Box {selectedBox}. 
                This will be processed exactly like a scanned barcode.
                {selectedBoxData && (
                  <span className="block mt-2 text-foreground">
                    Current position: #{selectedBoxData.lastScannedTicketNumber ?? selectedBoxData.startingTicketNumber}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="manual-barcode">Barcode Value</Label>
                <Input
                  id="manual-barcode"
                  type="text"
                  placeholder={settings.stateCode === 'DC' ? "e.g., 1619-04147-7-017" : "Enter barcode (e.g., 20 digits)"}
                  value={manualTicketNumber}
                  onChange={(e) => {
                    // Allow numeric input and dashes for DC format
                    const value = settings.stateCode === 'DC' 
                      ? e.target.value.replace(/[^0-9-]/g, '')
                      : e.target.value.replace(/\D/g, '');
                    setManualTicketNumber(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualTicketNumber.length >= 4) {
                      handleManualEntry();
                    }
                  }}
                  className="font-mono text-lg"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  {settings.stateCode === 'DC' 
                    ? 'Enter barcode in format: 1619-04147-7-017'
                    : 'Enter the full barcode value (minimum 4 digits)'
                  }
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualEntryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualEntry} disabled={manualTicketNumber.length < 4}>
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ScanTickets;
