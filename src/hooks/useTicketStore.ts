import { useState, useEffect, useCallback, useRef } from 'react';
import { TicketBox, ScanResult, ScanError, GameInfo } from '@/types/ticket';
import { StateCode, TicketOrder } from '@/types/settings';
import { logErrorSecurely } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

// Type for undo state - stores the box state before the last scan
interface UndoState {
  boxNumber: number;
  previousBox: TicketBox;
  scanResult: ScanResult;
}

export const useTicketStore = (stateCode: StateCode) => {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState<TicketBox[]>([]);
  const [gameRegistry, setGameRegistry] = useState<GameInfo[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [lastError, setLastError] = useState<ScanError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Undo state - tracks the previous state for each box (keyed by box number)
  const [undoStateMap, setUndoStateMap] = useState<Map<number, UndoState>>(new Map());
  
  // Debounce refs for syncing
  const boxSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dailySyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch boxes and game registry from server
  const fetchDataFromServer = useCallback(async () => {
    if (!user) {
      setBoxes([]);
      setGameRegistry([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const today = getTodayDateString();

      // Fetch box configurations
      const { data: boxData, error: boxError } = await supabase
        .from('box_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .order('box_number', { ascending: true });

      if (boxError) throw boxError;

      // Fetch today's daily scanning state
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_scanning_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .eq('business_date', today);

      if (dailyError) throw dailyError;

      // Fetch game registry
      const { data: gameData, error: gameError } = await supabase
        .from('game_registry')
        .select('*')
        .eq('user_id', user.id)
        .eq('state_code', stateCode);

      if (gameError) throw gameError;

      // Map box configurations with daily counts
      const dailyCountsMap = new Map(
        (dailyData || []).map(d => [d.box_number, { ticketsSold: d.tickets_sold, totalAmountSold: Number(d.total_amount_sold) }])
      );

      const loadedBoxes: TicketBox[] = (boxData || []).map(box => ({
        id: box.box_number,
        boxNumber: box.box_number,
        ticketPrice: Number(box.ticket_price),
        totalTicketsPerBook: box.total_tickets_per_book,
        startingTicketNumber: box.starting_ticket_number,
        lastScannedTicketNumber: box.last_scanned_ticket_number,
        ticketsSold: dailyCountsMap.get(box.box_number)?.ticketsSold ?? 0,
        totalAmountSold: dailyCountsMap.get(box.box_number)?.totalAmountSold ?? 0,
        isConfigured: box.is_configured,
        gameNumber: box.game_number,
        bookNumber: box.book_number,
      }));

      setBoxes(loadedBoxes);
      setGameRegistry(
        (gameData || []).map(g => ({
          gameNumber: g.game_number,
          ticketPrice: Number(g.ticket_price),
          totalTicketsPerBook: g.total_tickets_per_book,
        }))
      );
    } catch {
      logErrorSecurely('fetchDataFromServer');
      setBoxes([]);
      setGameRegistry([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, stateCode]);

  // Fetch data on mount and when user/stateCode changes
  useEffect(() => {
    fetchDataFromServer();
    // Clear transient state
    setScanHistory([]);
    setLastScanResult(null);
    setLastError(null);
  }, [fetchDataFromServer]);

  // Sync box configuration to server (debounced)
  const syncBoxToServer = useCallback(async (box: TicketBox) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('box_configurations')
        .upsert({
          user_id: user.id,
          state_code: stateCode,
          box_number: box.boxNumber,
          ticket_price: box.ticketPrice,
          total_tickets_per_book: box.totalTicketsPerBook,
          starting_ticket_number: box.startingTicketNumber,
          last_scanned_ticket_number: box.lastScannedTicketNumber,
          is_configured: box.isConfigured,
          game_number: box.gameNumber,
          book_number: box.bookNumber,
        }, {
          onConflict: 'user_id,state_code,box_number',
        });

      if (error) throw error;
    } catch {
      logErrorSecurely('syncBoxToServer');
    }
  }, [user, stateCode]);

  // Sync daily scanning state to server (debounced)
  const syncDailyStateToServer = useCallback(async (box: TicketBox) => {
    if (!user) return;

    const today = getTodayDateString();

    try {
      const { error } = await supabase
        .from('daily_scanning_state')
        .upsert({
          user_id: user.id,
          state_code: stateCode,
          business_date: today,
          box_number: box.boxNumber,
          tickets_sold: box.ticketsSold,
          total_amount_sold: box.totalAmountSold,
        }, {
          onConflict: 'user_id,state_code,business_date,box_number',
        });

      if (error) throw error;
    } catch {
      logErrorSecurely('syncDailyStateToServer');
    }
  }, [user, stateCode]);

  // Sync game to registry on server
  const syncGameToServer = useCallback(async (game: GameInfo) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('game_registry')
        .upsert({
          user_id: user.id,
          state_code: stateCode,
          game_number: game.gameNumber,
          ticket_price: game.ticketPrice,
          total_tickets_per_book: game.totalTicketsPerBook,
        }, {
          onConflict: 'user_id,state_code,game_number',
        });

      if (error) throw error;
    } catch {
      logErrorSecurely('syncGameToServer');
    }
  }, [user, stateCode]);

  // Delete box from server
  const deleteBoxFromServer = useCallback(async (boxNumber: number) => {
    if (!user) return;

    try {
      await supabase
        .from('box_configurations')
        .delete()
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .eq('box_number', boxNumber);

      // Also delete daily state for this box
      await supabase
        .from('daily_scanning_state')
        .delete()
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .eq('box_number', boxNumber);
    } catch {
      logErrorSecurely('deleteBoxFromServer');
    }
  }, [user, stateCode]);

  // Register a game in the global registry
  const registerGame = useCallback((gameNumber: string, ticketPrice: number, totalTicketsPerBook: number) => {
    setGameRegistry(prev => {
      const existing = prev.find(g => g.gameNumber === gameNumber);
      if (existing) {
        return prev;
      }
      const newGame = { gameNumber, ticketPrice, totalTicketsPerBook };
      syncGameToServer(newGame);
      return [...prev, newGame];
    });
  }, [syncGameToServer]);

  // Update an existing game in the registry
  const updateGame = useCallback((gameNumber: string, updates: { ticketPrice: number; totalTicketsPerBook: number }) => {
    setGameRegistry(prev => {
      const updated = prev.map(game => {
        if (game.gameNumber === gameNumber) {
          const updatedGame = { ...game, ...updates };
          syncGameToServer(updatedGame);
          return updatedGame;
        }
        return game;
      });
      return updated;
    });
  }, [syncGameToServer]);

  // Delete a game from the registry
  const deleteGame = useCallback(async (gameNumber: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('game_registry')
        .delete()
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .eq('game_number', gameNumber);

      if (error) throw error;

      setGameRegistry(prev => prev.filter(game => game.gameNumber !== gameNumber));
    } catch {
      logErrorSecurely('deleteGame');
    }
  }, [user, stateCode]);

  // Add a book to a box (configures the box with game info)
  const addBookToBox = useCallback((
    boxNumber: number,
    gameNumber: string,
    bookNumber: string,
    ticketPrice: number,
    totalTicketsPerBook: number,
    startingTicketNumber: number
  ) => {
    registerGame(gameNumber, ticketPrice, totalTicketsPerBook);
    
    setBoxes(prev => {
      const updated = prev.map(box => {
        if (box.boxNumber === boxNumber) {
          const newBox = {
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
          };
          syncBoxToServer(newBox);
          syncDailyStateToServer(newBox);
          return newBox;
        }
        return box;
      });
      return updated;
    });
  }, [registerGame, syncBoxToServer, syncDailyStateToServer]);

  const updateBox = useCallback((boxNumber: number, updates: Partial<TicketBox>) => {
    setBoxes(prev => {
      const updated = prev.map(box => {
        if (box.boxNumber === boxNumber) {
          const newBox = { ...box, ...updates, isConfigured: true };
          syncBoxToServer(newBox);
          return newBox;
        }
        return box;
      });
      return updated;
    });
  }, [syncBoxToServer]);

  const addBox = useCallback(() => {
    setBoxes(prev => {
      const existingNumbers = prev.map(b => b.boxNumber);
      let nextNumber = 1;
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++;
      }
      const newBox = createNewBox(nextNumber);
      syncBoxToServer(newBox);
      return [...prev, newBox].sort((a, b) => a.boxNumber - b.boxNumber);
    });
  }, [syncBoxToServer]);

  const addBoxWithNumber = useCallback((boxNumber: number) => {
    setBoxes(prev => {
      if (prev.some(b => b.boxNumber === boxNumber)) {
        return prev;
      }
      const newBox = createNewBox(boxNumber);
      syncBoxToServer(newBox);
      return [...prev, newBox].sort((a, b) => a.boxNumber - b.boxNumber);
    });
  }, [syncBoxToServer]);

  const removeBox = useCallback((boxNumber: number) => {
    setBoxes(prev => prev.filter(box => box.boxNumber !== boxNumber));
    deleteBoxFromServer(boxNumber);
  }, [deleteBoxFromServer]);

  // Normalize book number by removing leading zeros for consistent comparison
  const normalizeBookNumber = useCallback((bookNumber: string): string => {
    // Remove leading zeros but keep at least one digit
    return bookNumber.replace(/^0+/, '') || '0';
  }, []);

  // Extract game number, book number, and ticket number from barcode based on state
  const extractBarcodeInfo = useCallback((barcode: string, barcodeStateCode: StateCode): { gameNumber: string; bookNumber: string; ticketNumber: number } | null => {
    if (barcodeStateCode === 'DC') {
      if (barcode.includes('-')) {
        const segments = barcode.split('-');
        if (segments.length >= 3) {
          const gameNumber = segments[0];
          // Normalize book number for DC to handle leading zeros consistently
          const bookNumber = normalizeBookNumber(segments[1]);
          const ticketStr = segments[segments.length - 1];
          const ticketNumber = parseInt(ticketStr, 10);
          
          if (!isNaN(ticketNumber) && gameNumber && bookNumber) {
            return { gameNumber, bookNumber, ticketNumber };
          }
        }
        return null;
      }
      
      if (/^\d{12,}$/.test(barcode)) {
        const gameNumber = barcode.substring(0, 4);
        // Normalize book number for DC to handle leading zeros consistently
        const bookNumber = normalizeBookNumber(barcode.substring(4, 9));
        const ticketStr = barcode.substring(9, 12);
        const ticketNumber = parseInt(ticketStr, 10);
        
        if (!isNaN(ticketNumber) && gameNumber && bookNumber) {
          return { gameNumber, bookNumber, ticketNumber };
        }
      }
      
      return null;
    }
    
    if (!/^\d{20}$/.test(barcode)) {
      return null;
    }
    
    const gameNumber = barcode.substring(0, 3);
    const bookNumber = barcode.substring(3, 9);
    const ticketStr = barcode.substring(9, 12);
    const ticketNumber = parseInt(ticketStr, 10);
    
    return { gameNumber, bookNumber, ticketNumber };
  }, [normalizeBookNumber]);

  const extractTicketNumber = useCallback((barcode: string, barcodeStateCode: StateCode): number | null => {
    const info = extractBarcodeInfo(barcode, barcodeStateCode);
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

    if (barcodeGameNumber && barcodeBookNumber) {
      // Normalize stored book number for comparison (important for DC where book numbers may have leading zeros)
      const normalizedStoredBookNumber = box.bookNumber ? normalizeBookNumber(box.bookNumber) : null;
      const normalizedBarcodeBookNumber = normalizeBookNumber(barcodeBookNumber);
      
      if (box.gameNumber === barcodeGameNumber && normalizedStoredBookNumber !== normalizedBarcodeBookNumber) {
        bookTransition = true;
        
        const lastTicket = box.lastScannedTicketNumber ?? box.startingTicketNumber;
        remainingTicketsSold = lastTicket;
        remainingAmount = remainingTicketsSold * box.ticketPrice;
        
        const gameInfo = gameRegistry.find(g => g.gameNumber === barcodeGameNumber);
        if (gameInfo) {
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
        const gameInfo = gameRegistry.find(g => g.gameNumber === barcodeGameNumber);
        if (!gameInfo) {
          const error: ScanError = {
            type: 'unknown_game',
            message: `Unknown game #${barcodeGameNumber}. Please add this game via Box Setup first.`
          };
          setLastError(error);
          return { error };
        }
        
        const lastTicket = box.lastScannedTicketNumber ?? box.startingTicketNumber;
        remainingTicketsSold = lastTicket;
        remainingAmount = remainingTicketsSold * box.ticketPrice;
        bookTransition = true;
        
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

    const referenceNumber = updatedBox.lastScannedTicketNumber ?? updatedBox.startingTicketNumber;

    // Only flag a duplicate when we have evidence this box has scanned sales *today*.
    // This prevents false "already scanned" errors at the start of a fresh day where
    // the last-scanned pointer may legitimately match the first ticket scanned (0 sold).
    if (
      updatedBox.lastScannedTicketNumber !== null &&
      ticketNumber === updatedBox.lastScannedTicketNumber &&
      box.ticketsSold > 0
    ) {
      const error: ScanError = {
        type: 'duplicate_scan',
        message: `Ticket #${ticketNumber} was already scanned.`
      };
      setLastError(error);
      return { error };
    }

    const isDescending = ticketOrder === 'descending';
    
    if (isDescending) {
      if (ticketNumber > referenceNumber) {
        const error: ScanError = {
          type: 'invalid_sequence',
          message: `Invalid sequence: Ticket #${ticketNumber} is higher than last ticket #${referenceNumber}. Tickets should decrease.`
        };
        setLastError(error);
        return { error };
      }
    } else {
      if (ticketNumber < referenceNumber) {
        const error: ScanError = {
          type: 'invalid_sequence',
          message: `Invalid sequence: Ticket #${ticketNumber} is lower than last ticket #${referenceNumber}. Tickets should increase.`
        };
        setLastError(error);
        return { error };
      }
    }

    const ticketsSoldThisScan = isDescending 
      ? referenceNumber - ticketNumber 
      : ticketNumber - referenceNumber;
    
    const totalSoldAfterScan = updatedBox.ticketsSold + ticketsSoldThisScan;
    if (totalSoldAfterScan > updatedBox.totalTicketsPerBook && !bookTransition) {
      const error: ScanError = {
        type: 'exceeds_book',
        message: `Warning: This would exceed book total (${totalSoldAfterScan} > ${updatedBox.totalTicketsPerBook})`
      };
      setLastError(error);
      return { error };
    }

    const amountSold = ticketsSoldThisScan * updatedBox.ticketPrice;

    // Update box and sync to server
    const finalBox = {
      ...updatedBox,
      lastScannedTicketNumber: ticketNumber,
      ticketsSold: updatedBox.ticketsSold + ticketsSoldThisScan,
      totalAmountSold: updatedBox.totalAmountSold + amountSold,
    };

    // Save the original box state for undo (before this scan was applied)
    const originalBox = { ...box };

    setBoxes(prev => prev.map(b => 
      b.boxNumber === selectedBoxNumber ? finalBox : b
    ));

    // Sync both box config and daily state
    syncBoxToServer(finalBox);
    syncDailyStateToServer(finalBox);

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
    setScanHistory(prev => [result, ...prev].slice(0, 50));

    // Save undo state for this box (stores original state before this scan)
    setUndoStateMap(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedBoxNumber, {
        boxNumber: selectedBoxNumber,
        previousBox: originalBox,
        scanResult: result,
      });
      return newMap;
    });

    return { result };
  }, [boxes, gameRegistry, normalizeBookNumber, syncBoxToServer, syncDailyStateToServer]);

  const processBarcode = useCallback((
    barcode: string, 
    selectedBoxNumber: number,
    barcodeStateCode: StateCode,
    ticketOrder: TicketOrder
  ): { result?: ScanResult; error?: ScanError } => {
    setLastError(null);
    setLastScanResult(null);

    const barcodeInfo = extractBarcodeInfo(barcode, barcodeStateCode);
    
    if (barcodeInfo === null) {
      const errorMessage = barcodeStateCode === 'DC' 
        ? 'Invalid barcode format. Expected format: 1619-04147-7-017 or long numeric (12+ digits)'
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

    return validateAndProcessTicket(ticketNumber, selectedBoxNumber, ticketOrder, true);
  }, [validateAndProcessTicket]);

  // preserveStartingPosition: true = update starting number to last scanned (for Reset & Save)
  //                           false = keep original starting number (for Reset Without Saving)
  const resetDailyCounts = useCallback(async (preserveStartingPosition: boolean = true) => {
    if (!user) return;

    // Update boxes locally - clear lastScannedTicketNumber to allow re-scanning
    setBoxes(prev => prev.map(box => {
      // Only update starting number if preserving position AND there was a scanned ticket
      const newStartingNumber = preserveStartingPosition && box.lastScannedTicketNumber !== null
        ? box.lastScannedTicketNumber 
        : box.startingTicketNumber;
      
      const newBox = {
        ...box,
        ticketsSold: 0,
        totalAmountSold: 0,
        startingTicketNumber: newStartingNumber,
        lastScannedTicketNumber: null, // Clear to allow re-scanning after reset
      };
      // Sync box config to server (with updated starting number and cleared last scanned)
      syncBoxToServer(newBox);
      return newBox;
    }));

    // Delete today's daily scanning state
    const today = getTodayDateString();
    try {
      await supabase
        .from('daily_scanning_state')
        .delete()
        .eq('user_id', user.id)
        .eq('state_code', stateCode)
        .eq('business_date', today);
    } catch {
      logErrorSecurely('resetDailyCounts');
    }

    setScanHistory([]);
    setLastScanResult(null);
    setLastError(null);
    // Clear undo state on reset
    setUndoStateMap(new Map());
  }, [user, stateCode, syncBoxToServer]);

  // Undo the last scan for a specific box
  const undoLastScan = useCallback((boxNumber: number): boolean => {
    const undoState = undoStateMap.get(boxNumber);
    
    if (!undoState) {
      return false; // No undo available for this box
    }

    // Restore the previous box state
    const previousBox = undoState.previousBox;
    
    setBoxes(prev => prev.map(b => 
      b.boxNumber === boxNumber ? previousBox : b
    ));

    // Sync the restored state to server
    syncBoxToServer(previousBox);
    syncDailyStateToServer(previousBox);

    // Remove the scan from history
    setScanHistory(prev => prev.filter(scan => 
      !(scan.boxNumber === boxNumber && scan.timestamp.getTime() === undoState.scanResult.timestamp.getTime())
    ));

    // Clear the last scan result if it was from this box
    if (lastScanResult?.boxNumber === boxNumber) {
      setLastScanResult(null);
    }

    // Remove undo state for this box (can only undo once per scan)
    setUndoStateMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(boxNumber);
      return newMap;
    });

    return true;
  }, [undoStateMap, lastScanResult, syncBoxToServer, syncDailyStateToServer]);

  // Check if undo is available for a specific box
  const canUndoScan = useCallback((boxNumber: number): boolean => {
    return undoStateMap.has(boxNumber);
  }, [undoStateMap]);

  const getConfiguredBoxes = useCallback(() => {
    return boxes.filter(b => b.isConfigured);
  }, [boxes]);

  const getTotals = useCallback(() => {
    const configuredBoxes = boxes.filter(b => b.isConfigured);
    const totalTickets = configuredBoxes.reduce((sum, b) => sum + b.ticketsSold, 0);
    const totalAmount = configuredBoxes.reduce((sum, b) => sum + b.totalAmountSold, 0);
    return {
      totalTickets,
      totalAmount,
      activeBoxes: configuredBoxes.length,
    };
  }, [boxes]);

  // Refresh data from server (for manual refresh or after login)
  const refreshFromServer = useCallback(() => {
    return fetchDataFromServer();
  }, [fetchDataFromServer]);

  return {
    boxes,
    gameRegistry,
    scanHistory,
    lastScanResult,
    lastError,
    isLoading,
    isSyncing,
    updateBox,
    updateGame,
    deleteGame,
    addBox,
    addBoxWithNumber,
    addBookToBox,
    removeBox,
    processBarcode,
    processManualEntry,
    extractTicketNumber,
    resetDailyCounts,
    getConfiguredBoxes,
    getTotals,
    refreshFromServer,
    undoLastScan,
    canUndoScan,
  };
};
