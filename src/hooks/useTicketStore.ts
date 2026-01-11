import { useState, useEffect, useCallback } from 'react';
import { TicketBox, ScanResult, ScanError } from '@/types/ticket';
import { logErrorSecurely } from '@/lib/errorHandler';

// Use localStorage for box configuration persistence across days
const CONFIG_STORAGE_KEY = 'scratchoff-box-config';
const DAILY_STORAGE_KEY = 'scratchoff-daily-data';
const MAX_BOXES = 70;

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

interface DailyData {
  date: string;
  dailyCounts: Record<number, { ticketsSold: number; totalAmountSold: number }>;
}

const loadBoxes = (): TicketBox[] => {
  try {
    // Load persisted box configuration
    const configStored = localStorage.getItem(CONFIG_STORAGE_KEY);
    const dailyStored = localStorage.getItem(DAILY_STORAGE_KEY);
    
    if (!configStored) {
      return createInitialBoxes();
    }
    
    const configParsed = JSON.parse(configStored);
    let boxes: TicketBox[] = configParsed.boxes || createInitialBoxes();
    
    // Check if we need to reset daily counts (new day)
    const today = getTodayDateString();
    let dailyData: DailyData | null = null;
    
    if (dailyStored) {
      dailyData = JSON.parse(dailyStored);
    }
    
    if (!dailyData || dailyData.date !== today) {
      // New day: reset daily counts but preserve lastScannedTicketNumber
      boxes = boxes.map(box => ({
        ...box,
        ticketsSold: 0,
        totalAmountSold: 0,
      }));
      // Save the reset state
      localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({
        date: today,
        dailyCounts: {},
      }));
    } else {
      // Same day: restore daily counts
      boxes = boxes.map(box => {
        const dailyCounts = dailyData?.dailyCounts[box.boxNumber];
        if (dailyCounts) {
          return {
            ...box,
            ticketsSold: dailyCounts.ticketsSold,
            totalAmountSold: dailyCounts.totalAmountSold,
          };
        }
        return box;
      });
    }
    
    return boxes;
  } catch {
    logErrorSecurely('loadStoredData');
    return createInitialBoxes();
  }
};

export const useTicketStore = () => {
  const [boxes, setBoxes] = useState<TicketBox[]>(loadBoxes);

  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [lastError, setLastError] = useState<ScanError | null>(null);

  // Persist box configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ boxes }));
      
      // Also update daily counts
      const today = getTodayDateString();
      const dailyCounts: Record<number, { ticketsSold: number; totalAmountSold: number }> = {};
      boxes.forEach(box => {
        if (box.ticketsSold > 0 || box.totalAmountSold > 0) {
          dailyCounts[box.boxNumber] = {
            ticketsSold: box.ticketsSold,
            totalAmountSold: box.totalAmountSold,
          };
        }
      });
      localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ date: today, dailyCounts }));
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

  const validateAndProcessTicket = useCallback((
    ticketNumber: number, 
    selectedBoxNumber: number,
    isManualEntry: boolean = false
  ): { result?: ScanResult; error?: ScanError } => {
    const box = boxes.find(b => b.boxNumber === selectedBoxNumber);
    
    if (!box || !box.isConfigured) {
      const error: ScanError = {
        type: 'box_not_configured',
        message: `Box ${selectedBoxNumber} is not configured. Please set it up first.`
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
      message: isManualEntry 
        ? `Manual entry: Sold ${ticketsSoldThisScan} tickets for $${amountSold.toFixed(2)}`
        : `Sold ${ticketsSoldThisScan} tickets for $${amountSold.toFixed(2)}`,
      timestamp: new Date(),
    };

    setLastScanResult(result);
    setScanHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50 scans

    return { result };
  }, [boxes]);

  const processBarcode = useCallback((barcode: string, selectedBoxNumber: number): { result?: ScanResult; error?: ScanError } => {
    setLastError(null);
    setLastScanResult(null);

    const ticketNumber = extractTicketNumber(barcode);
    
    if (ticketNumber === null) {
      const error: ScanError = {
        type: 'invalid_barcode',
        message: 'Invalid barcode format. Expected 20 digits.'
      };
      setLastError(error);
      return { error };
    }

    return validateAndProcessTicket(ticketNumber, selectedBoxNumber, false);
  }, [validateAndProcessTicket]);

  const processManualEntry = useCallback((ticketNumber: number, selectedBoxNumber: number): { result?: ScanResult; error?: ScanError } => {
    setLastError(null);
    setLastScanResult(null);

    // Validate ticket number is non-negative
    if (ticketNumber < 0 || !Number.isInteger(ticketNumber)) {
      const error: ScanError = {
        type: 'invalid_barcode',
        message: 'Invalid ticket number. Must be a non-negative whole number.'
      };
      setLastError(error);
      return { error };
    }

    return validateAndProcessTicket(ticketNumber, selectedBoxNumber, true);
  }, [validateAndProcessTicket]);

  const resetDailyCounts = useCallback(() => {
    setBoxes(prev => prev.map(box => {
      // If this box was scanned today, update startingTicketNumber to lastScannedTicketNumber
      if (box.lastScannedTicketNumber !== null) {
        return {
          ...box,
          startingTicketNumber: box.lastScannedTicketNumber,
          ticketsSold: 0,
          totalAmountSold: 0,
          lastScannedTicketNumber: null,
        };
      }
      // Box wasn't scanned, just reset daily counts
      return {
        ...box,
        ticketsSold: 0,
        totalAmountSold: 0,
      };
    }));
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
    processManualEntry,
    resetDailyCounts,
    getConfiguredBoxes,
    getTotals,
    scanHistory,
    lastScanResult,
    lastError,
  };
};
