import { useState, useEffect, useCallback } from 'react';
import { TicketBox, ScanResult, ScanError, GameInfo } from '@/types/ticket';
import { StateCode, TicketOrder } from '@/types/settings';
import { logErrorSecurely } from '@/lib/errorHandler';

// Use localStorage for box configuration persistence across days
const CONFIG_STORAGE_KEY = 'scratchoff-box-config';
const DAILY_STORAGE_KEY = 'scratchoff-daily-data';
const GAME_REGISTRY_KEY = 'scratchoff-game-registry';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createNewBox = (boxNumber: number): TicketBox => ({
  id: boxNumber,
  boxNumber,
  ticketPrice: 0,
  totalTicketsPerBook: 0,
  startingTicketNumber: 0,
  lastScannedTicketNumber: null,
  ticketsSold: 0,
  totalAmountSold: 0,
  isConfigured: false,
  gameNumber: null,
  bookNumber: null,
});

const createInitialBoxes = (): TicketBox[] => {
  // Start with no boxes - user will add as needed
  return [];
};

const loadGameRegistry = (): GameInfo[] => {
  try {
    const stored = localStorage.getItem(GAME_REGISTRY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    logErrorSecurely('loadGameRegistry');
  }
  return [];
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
  const [gameRegistry, setGameRegistry] = useState<GameInfo[]>(loadGameRegistry);

  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [lastError, setLastError] = useState<ScanError | null>(null);

  // Persist game registry to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAME_REGISTRY_KEY, JSON.stringify(gameRegistry));
    } catch {
      logErrorSecurely('saveGameRegistry');
    }
  }, [gameRegistry]);

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

  // Register a game in the global registry
  const registerGame = useCallback((gameNumber: string, ticketPrice: number, totalTicketsPerBook: number) => {
    setGameRegistry(prev => {
      const existing = prev.find(g => g.gameNumber === gameNumber);
      if (existing) {
        return prev; // Game already registered
      }
      return [...prev, { gameNumber, ticketPrice, totalTicketsPerBook }];
    });
  }, []);

  // Add a book to a box (configures the box with game info)
  const addBookToBox = useCallback((
    boxNumber: number,
    gameNumber: string,
    bookNumber: string,
    ticketPrice: number,
    totalTicketsPerBook: number,
    startingTicketNumber: number
  ) => {
    // First, ensure game is in registry
    registerGame(gameNumber, ticketPrice, totalTicketsPerBook);
    
    // Update the box with book info
    setBoxes(prev => prev.map(box => 
      box.boxNumber === boxNumber 
        ? {
            ...box,
            gameNumber,
            bookNumber,
            ticketPrice,
            totalTicketsPerBook,
            startingTicketNumber,
            lastScannedTicketNumber: null,
            ticketsSold: 0,
            totalAmountSold: 0,
            isConfigured: true,
          }
        : box
    ));
  }, [registerGame]);

  const updateBox = useCallback((boxNumber: number, updates: Partial<TicketBox>) => {
    setBoxes(prev => prev.map(box => 
      box.boxNumber === boxNumber 
        ? { ...box, ...updates, isConfigured: true }
        : box
    ));
  }, []);

  const addBox = useCallback(() => {
    setBoxes(prev => {
      // Find the next available box number
      const existingNumbers = prev.map(b => b.boxNumber);
      let nextNumber = 1;
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++;
      }
      return [...prev, createNewBox(nextNumber)].sort((a, b) => a.boxNumber - b.boxNumber);
    });
  }, []);

  const addBoxWithNumber = useCallback((boxNumber: number) => {
    setBoxes(prev => {
      // Check if box number already exists
      if (prev.some(b => b.boxNumber === boxNumber)) {
        return prev;
      }
      return [...prev, createNewBox(boxNumber)].sort((a, b) => a.boxNumber - b.boxNumber);
    });
  }, []);

  const removeBox = useCallback((boxNumber: number) => {
    setBoxes(prev => prev.filter(box => box.boxNumber !== boxNumber));
  }, []);

  // Extract game number, book number, and ticket number from barcode based on state
  const extractBarcodeInfo = useCallback((barcode: string, stateCode: StateCode): { gameNumber: string; bookNumber: string; ticketNumber: number } | null => {
    if (stateCode === 'DC') {
      // Washington DC format: 1619-04147-7-017 (with dashes)
      // Remove dashes and validate
      const cleanBarcode = barcode.replace(/-/g, '');
      
      // Split by dash to get segments
      const segments = barcode.split('-');
      if (segments.length >= 3) {
        // Game number: first segment (e.g., "1619")
        const gameNumber = segments[0];
        // Book number: second segment (e.g., "04147")
        const bookNumber = segments[1];
        // Ticket number: last segment (e.g., "017")
        const ticketStr = segments[segments.length - 1];
        const ticketNumber = parseInt(ticketStr, 10);
        
        if (!isNaN(ticketNumber) && gameNumber && bookNumber) {
          return { gameNumber, bookNumber, ticketNumber };
        }
      }
      return null;
    }
    
    // Maryland format: 20-digit numeric barcode
    if (!/^\d{20}$/.test(barcode)) {
      return null;
    }
    
    // Game number: first 3 digits
    const gameNumber = barcode.substring(0, 3);
    // Book number: digits 4-9 (6 digits)
    const bookNumber = barcode.substring(3, 9);
    // Ticket number: middle 3 digits (positions 10-12, 0-indexed: 9-11)
    const ticketStr = barcode.substring(9, 12);
    const ticketNumber = parseInt(ticketStr, 10);
    
    return { gameNumber, bookNumber, ticketNumber };
  }, []);

  const extractTicketNumber = useCallback((barcode: string, stateCode: StateCode): number | null => {
    const info = extractBarcodeInfo(barcode, stateCode);
    return info ? info.ticketNumber : null;
  }, [extractBarcodeInfo]);

  const validateAndProcessTicket = useCallback((
    ticketNumber: number, 
    selectedBoxNumber: number,
    ticketOrder: TicketOrder,
    isManualEntry: boolean = false,
    barcodeGameNumber?: string,
    barcodeBookNumber?: string
  ): { result?: ScanResult; error?: ScanError } => {
    const box = boxes.find(b => b.boxNumber === selectedBoxNumber);
    
    if (!box || !box.isConfigured) {
      const error: ScanError = {
        type: 'box_not_configured',
        message: `Box ${selectedBoxNumber} is not configured. Please add a book first.`
      };
      setLastError(error);
      return { error };
    }

    let updatedBox = { ...box };
    let bookTransition = false;
    let remainingTicketsSold = 0;
    let remainingAmount = 0;

    // Check if this is a new book for the same game in this box
    if (barcodeGameNumber && barcodeBookNumber) {
      if (box.gameNumber === barcodeGameNumber && box.bookNumber !== barcodeBookNumber) {
        // Same game, different book - this is a book transition
        bookTransition = true;
        
        // Calculate remaining tickets from previous book
        const lastTicket = box.lastScannedTicketNumber ?? box.startingTicketNumber;
        remainingTicketsSold = lastTicket; // All remaining tickets are sold
        remainingAmount = remainingTicketsSold * box.ticketPrice;
        
        // Get game info from registry for the new book
        const gameInfo = gameRegistry.find(g => g.gameNumber === barcodeGameNumber);
        if (gameInfo) {
          // Reset for new book
          updatedBox = {
            ...box,
            bookNumber: barcodeBookNumber,
            startingTicketNumber: gameInfo.totalTicketsPerBook,
            lastScannedTicketNumber: null,
            ticketsSold: box.ticketsSold + remainingTicketsSold,
            totalAmountSold: box.totalAmountSold + remainingAmount,
          };
        }
      } else if (box.gameNumber !== barcodeGameNumber) {
        // Different game - need to check if it's in registry
        const gameInfo = gameRegistry.find(g => g.gameNumber === barcodeGameNumber);
        if (!gameInfo) {
          const error: ScanError = {
            type: 'unknown_game',
            message: `Unknown game #${barcodeGameNumber}. Please add this game via Box Setup first.`
          };
          setLastError(error);
          return { error };
        }
        
        // Count remaining tickets from previous book as sold
        const lastTicket = box.lastScannedTicketNumber ?? box.startingTicketNumber;
        remainingTicketsSold = lastTicket;
        remainingAmount = remainingTicketsSold * box.ticketPrice;
        bookTransition = true;
        
        // Switch to new game/book
        updatedBox = {
          ...box,
          gameNumber: barcodeGameNumber,
          bookNumber: barcodeBookNumber,
          ticketPrice: gameInfo.ticketPrice,
          totalTicketsPerBook: gameInfo.totalTicketsPerBook,
          startingTicketNumber: gameInfo.totalTicketsPerBook,
          lastScannedTicketNumber: null,
          ticketsSold: box.ticketsSold + remainingTicketsSold,
          totalAmountSold: box.totalAmountSold + remainingAmount,
        };
      }
    }

    // Get the reference number (either last scanned or starting number)
    const referenceNumber = updatedBox.lastScannedTicketNumber ?? updatedBox.startingTicketNumber;

    // Check for duplicate scan
    if (updatedBox.lastScannedTicketNumber !== null && ticketNumber === updatedBox.lastScannedTicketNumber) {
      const error: ScanError = {
        type: 'duplicate_scan',
        message: `Ticket #${ticketNumber} was already scanned.`
      };
      setLastError(error);
      return { error };
    }

    // Validate ticket sequence based on ticket order
    const isDescending = ticketOrder === 'descending';
    
    if (isDescending) {
      // Descending: ticket numbers decrease (60, 59, 58...)
      if (ticketNumber > referenceNumber) {
        const error: ScanError = {
          type: 'invalid_sequence',
          message: `Invalid sequence: Ticket #${ticketNumber} is higher than last ticket #${referenceNumber}. Tickets should decrease.`
        };
        setLastError(error);
        return { error };
      }
    } else {
      // Ascending: ticket numbers increase (1, 2, 3...)
      if (ticketNumber < referenceNumber) {
        const error: ScanError = {
          type: 'invalid_sequence',
          message: `Invalid sequence: Ticket #${ticketNumber} is lower than last ticket #${referenceNumber}. Tickets should increase.`
        };
        setLastError(error);
        return { error };
      }
    }

    // Calculate tickets sold in this scan based on order
    const ticketsSoldThisScan = isDescending 
      ? referenceNumber - ticketNumber 
      : ticketNumber - referenceNumber;
    
    // Validate doesn't exceed book total
    const totalSoldAfterScan = updatedBox.ticketsSold + ticketsSoldThisScan;
    if (totalSoldAfterScan > updatedBox.totalTicketsPerBook && !bookTransition) {
      const error: ScanError = {
        type: 'exceeds_book',
        message: `Warning: This would exceed book total (${totalSoldAfterScan} > ${updatedBox.totalTicketsPerBook})`
      };
      setLastError(error);
      return { error };
    }

    // Calculate amount
    const amountSold = ticketsSoldThisScan * updatedBox.ticketPrice;

    // Update box
    setBoxes(prev => prev.map(b => 
      b.boxNumber === selectedBoxNumber
        ? {
            ...updatedBox,
            lastScannedTicketNumber: ticketNumber,
            ticketsSold: updatedBox.ticketsSold + ticketsSoldThisScan,
            totalAmountSold: updatedBox.totalAmountSold + amountSold,
          }
        : b
    ));

    const totalTicketsSold = ticketsSoldThisScan + remainingTicketsSold;
    const totalAmount = amountSold + remainingAmount;

    let message = isManualEntry 
      ? `Manual entry: Sold ${ticketsSoldThisScan} tickets for $${amountSold.toFixed(2)}`
      : `Sold ${ticketsSoldThisScan} tickets for $${amountSold.toFixed(2)}`;
    
    if (bookTransition) {
      message = `New book started! Previous book: ${remainingTicketsSold} tickets ($${remainingAmount.toFixed(2)}). This scan: ${ticketsSoldThisScan} tickets ($${amountSold.toFixed(2)})`;
    }

    const result: ScanResult = {
      success: true,
      boxNumber: selectedBoxNumber,
      ticketNumber,
      ticketsSold: totalTicketsSold,
      amountSold: totalAmount,
      message,
      timestamp: new Date(),
      gameNumber: barcodeGameNumber || box.gameNumber || undefined,
      bookNumber: barcodeBookNumber || box.bookNumber || undefined,
      bookTransition,
    };

    setLastScanResult(result);
    setScanHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50 scans

    return { result };
  }, [boxes, gameRegistry]);

  const processBarcode = useCallback((
    barcode: string, 
    selectedBoxNumber: number,
    stateCode: StateCode,
    ticketOrder: TicketOrder
  ): { result?: ScanResult; error?: ScanError } => {
    setLastError(null);
    setLastScanResult(null);

    const barcodeInfo = extractBarcodeInfo(barcode, stateCode);
    
    if (barcodeInfo === null) {
      const errorMessage = stateCode === 'DC' 
        ? 'Invalid barcode format. Expected format: 1619-04147-7-017'
        : 'Invalid barcode format. Expected 20 digits.';
      const error: ScanError = {
        type: 'invalid_barcode',
        message: errorMessage
      };
      setLastError(error);
      return { error };
    }

    return validateAndProcessTicket(
      barcodeInfo.ticketNumber, 
      selectedBoxNumber, 
      ticketOrder,
      false,
      barcodeInfo.gameNumber,
      barcodeInfo.bookNumber
    );
  }, [extractBarcodeInfo, validateAndProcessTicket]);

  const processManualEntry = useCallback((
    ticketNumber: number, 
    selectedBoxNumber: number,
    ticketOrder: TicketOrder
  ): { result?: ScanResult; error?: ScanError } => {
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

    return validateAndProcessTicket(ticketNumber, selectedBoxNumber, ticketOrder, true);
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
    gameRegistry,
    updateBox,
    addBox,
    addBoxWithNumber,
    addBookToBox,
    registerGame,
    removeBox,
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
