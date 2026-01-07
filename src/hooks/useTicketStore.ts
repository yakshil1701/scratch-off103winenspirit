import { useState, useEffect, useCallback } from 'react';
import { TicketBox, ScanResult, ScanError } from '@/types/ticket';
import { logErrorSecurely } from '@/lib/errorHandler';

// Use sessionStorage instead of localStorage for security - data clears when tab closes
const STORAGE_KEY = 'scratchoff-ticket-data';
const MAX_BOXES = 70;

const createInitialBoxes = (): TicketBox[] => {
  return Array.from({ length: MAX_BOXES }, (_, i) => ({
    id: i + 1,
    boxNumber: i + 1,
    ticketPrice: 0,
    totalTicketsPerBook: 0,
    startingTicketNumber: 0,
    lastScannedTicketNumber: null,
    ticketsSold: 0,
    totalAmountSold: 0,
    isConfigured: false,
  }));
};

export const useTicketStore = () => {
  const [boxes, setBoxes] = useState<TicketBox[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.boxes || createInitialBoxes();
      }
    } catch {
      logErrorSecurely('loadStoredData');
    }
    return createInitialBoxes();
  });

  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [lastError, setLastError] = useState<ScanError | null>(null);

  // Persist to sessionStorage (clears when browser tab closes for security)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ boxes }));
    } catch {
      logErrorSecurely('saveStoredData');
    }
  }, [boxes]);

  const updateBox = useCallback((boxNumber: number, updates: Partial<TicketBox>) => {
    setBoxes(prev => prev.map(box => 
      box.boxNumber === boxNumber 
        ? { ...box, ...updates, isConfigured: true }
        : box
    ));
  }, []);

  const extractTicketNumber = (barcode: string): number | null => {
    // Validate barcode is numeric and has sufficient length
    if (!/^\d{20}$/.test(barcode)) {
      return null;
    }
    
    // Extract middle 3 digits (positions 10-12, 0-indexed: 9-11)
    const ticketStr = barcode.substring(9, 12);
    return parseInt(ticketStr, 10);
  };

  const processBarcode = useCallback((barcode: string, selectedBoxNumber: number): { result?: ScanResult; error?: ScanError } => {
    setLastError(null);
    setLastScanResult(null);

    const box = boxes.find(b => b.boxNumber === selectedBoxNumber);
    
    if (!box || !box.isConfigured) {
      const error: ScanError = {
        type: 'box_not_configured',
        message: `Box ${selectedBoxNumber} is not configured. Please set it up first.`
      };
      setLastError(error);
      return { error };
    }

    const ticketNumber = extractTicketNumber(barcode);
    
    if (ticketNumber === null) {
      const error: ScanError = {
        type: 'invalid_barcode',
        message: 'Invalid barcode format. Expected 20 digits.'
      };
      setLastError(error);
      return { error };
    }

    // Get the reference number (either last scanned or starting number)
    const referenceNumber = box.lastScannedTicketNumber ?? box.startingTicketNumber;

    // Check for duplicate scan
    if (box.lastScannedTicketNumber !== null && ticketNumber === box.lastScannedTicketNumber) {
      const error: ScanError = {
        type: 'duplicate_scan',
        message: `Ticket #${ticketNumber} was already scanned.`
      };
      setLastError(error);
      return { error };
    }

    // Validate ticket sequence (numbers should decrease)
    if (ticketNumber > referenceNumber) {
      const error: ScanError = {
        type: 'invalid_sequence',
        message: `Invalid sequence: Ticket #${ticketNumber} is higher than last ticket #${referenceNumber}. Tickets should decrease.`
      };
      setLastError(error);
      return { error };
    }

    // Calculate tickets sold in this scan
    const ticketsSoldThisScan = referenceNumber - ticketNumber;
    
    // Validate doesn't exceed book total
    const totalSoldAfterScan = box.ticketsSold + ticketsSoldThisScan;
    if (totalSoldAfterScan > box.totalTicketsPerBook) {
      const error: ScanError = {
        type: 'exceeds_book',
        message: `Warning: This would exceed book total (${totalSoldAfterScan} > ${box.totalTicketsPerBook})`
      };
      setLastError(error);
      return { error };
    }

    // Calculate amount
    const amountSold = ticketsSoldThisScan * box.ticketPrice;

    // Update box
    setBoxes(prev => prev.map(b => 
      b.boxNumber === selectedBoxNumber
        ? {
            ...b,
            lastScannedTicketNumber: ticketNumber,
            ticketsSold: b.ticketsSold + ticketsSoldThisScan,
            totalAmountSold: b.totalAmountSold + amountSold,
          }
        : b
    ));

    const result: ScanResult = {
      success: true,
      boxNumber: selectedBoxNumber,
      ticketNumber,
      ticketsSold: ticketsSoldThisScan,
      amountSold,
      message: `Sold ${ticketsSoldThisScan} tickets for $${amountSold.toFixed(2)}`,
      timestamp: new Date(),
    };

    setLastScanResult(result);
    setScanHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50 scans

    return { result };
  }, [boxes]);

  const resetDailyCounts = useCallback(() => {
    setBoxes(prev => prev.map(box => ({
      ...box,
      ticketsSold: 0,
      totalAmountSold: 0,
      lastScannedTicketNumber: null,
    })));
    setScanHistory([]);
    setLastScanResult(null);
    setLastError(null);
  }, []);

  const getConfiguredBoxes = useCallback(() => {
    return boxes.filter(box => box.isConfigured);
  }, [boxes]);

  const getTotals = useCallback(() => {
    const configured = boxes.filter(b => b.isConfigured);
    return {
      totalTicketsSold: configured.reduce((sum, b) => sum + b.ticketsSold, 0),
      totalAmountSold: configured.reduce((sum, b) => sum + b.totalAmountSold, 0),
      activeBoxes: configured.filter(b => b.ticketsSold > 0).length,
    };
  }, [boxes]);

  return {
    boxes,
    updateBox,
    processBarcode,
    resetDailyCounts,
    getConfiguredBoxes,
    getTotals,
    scanHistory,
    lastScanResult,
    lastError,
  };
};
