import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailySummary, DailyBoxSale, HistoricalSummaryData } from '@/types/summary';
import { TicketBox } from '@/types/ticket';
import { StateCode } from '@/types/settings';
import { logErrorSecurely } from '@/lib/errorHandler';
import { useAuth } from '@/hooks/useAuth';

const getDayOfWeek = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useSummaryHistory = (stateCode: StateCode) => {
  const { user } = useAuth();
  const [historicalSummaries, setHistoricalSummaries] = useState<DailySummary[]>([]);
  const [selectedHistoricalData, setSelectedHistoricalData] = useState<HistoricalSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBoxSales, setEditedBoxSales] = useState<DailyBoxSale[]>([]);
  
  // Application-level lock to prevent race conditions in save operations
  const saveLockRef = useRef<Promise<{ success: boolean; message: string }>>(Promise.resolve({ success: true, message: '' }));

  // Clear historical selection when state changes
  useEffect(() => {
    setSelectedHistoricalData(null);
    setIsEditMode(false);
    setEditedBoxSales([]);
    setHistoricalSummaries([]);
  }, [stateCode]);

  // Fetch all historical summaries for filtering (state-specific and user-specific)
  const fetchSummaryList = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('state_code', stateCode)
        .eq('user_id', user.id)
        .order('summary_date', { ascending: false });

      if (error) throw error;
      setHistoricalSummaries(data || []);
    } catch (error) {
      logErrorSecurely('fetchSummaryList');
    } finally {
      setIsLoading(false);
    }
  }, [stateCode, user]);

  // Fetch a specific historical summary with box sales (state-specific and user-specific)
  const fetchHistoricalSummary = useCallback(async (summaryDate: string) => {
    if (!user) return null;
    
    setIsLoading(true);
    setIsEditMode(false);
    try {
      const { data: summaryData, error: summaryError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('summary_date', summaryDate)
        .eq('state_code', stateCode)
        .eq('user_id', user.id)
        .maybeSingle();

      if (summaryError) throw summaryError;

      if (!summaryData) {
        setSelectedHistoricalData(null);
        return null;
      }

      const { data: boxSalesData, error: boxError } = await supabase
        .from('daily_box_sales')
        .select('*')
        .eq('summary_id', summaryData.id)
        .eq('state_code', stateCode)
        .eq('user_id', user.id)
        .order('box_number', { ascending: true });

      if (boxError) throw boxError;

      const historicalData: HistoricalSummaryData = {
        summary: summaryData,
        boxSales: boxSalesData || [],
      };

      setSelectedHistoricalData(historicalData);
      setEditedBoxSales(boxSalesData || []);
      return historicalData;
    } catch (error) {
      logErrorSecurely('fetchHistoricalSummary');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [stateCode, user]);

  // Save today's summary to history (called on reset) - with application-level lock to prevent race conditions
  const saveDailySummary = useCallback(async (boxes: TicketBox[]) => {
    if (!user) return { success: false, message: 'Not authenticated' };
    
    // Queue saves to prevent concurrent execution (race condition prevention)
    const saveOperation = async (): Promise<{ success: boolean; message: string }> => {
      // Use local date to avoid timezone issues
      const todayDate = getTodayDateString();

      // Fetch the latest daily_scanning_state from the server to get accurate counts
      // This avoids stale data from the boxes parameter which may not reflect completed server syncs
      let businessDate = todayDate;
      let serverDailyCounts: Map<number, { ticketsSold: number; totalAmountSold: number }> = new Map();
      
      try {
        const { data: scanningStates } = await supabase
          .from('daily_scanning_state')
          .select('*')
          .eq('user_id', user.id)
          .eq('state_code', stateCode)
          .order('business_date', { ascending: false });

        if (scanningStates && scanningStates.length > 0) {
          businessDate = scanningStates[0].business_date;
          // Build a map of server-side daily counts for the business date
          for (const state of scanningStates) {
            if (state.business_date === businessDate) {
              serverDailyCounts.set(state.box_number, {
                ticketsSold: state.tickets_sold,
                totalAmountSold: Number(state.total_amount_sold),
              });
            }
          }
        }
      } catch {
        // Fallback: use the passed boxes data
      }

      const businessDateObj = new Date(businessDate + 'T12:00:00'); // Use noon to avoid timezone issues
      const summaryDate = businessDate;
      const dayOfWeek = getDayOfWeek(businessDateObj);

      // Merge server-side daily counts with box configuration data for accuracy
      // Use server counts when available (they reflect completed syncs), fall back to local boxes
      const configuredBoxes = boxes
        .filter(b => b.isConfigured)
        .map(b => {
          const serverCounts = serverDailyCounts.get(b.boxNumber);
          if (serverCounts) {
            return {
              ...b,
              ticketsSold: serverCounts.ticketsSold,
              totalAmountSold: serverCounts.totalAmountSold,
            };
          }
          return b;
        })
        .filter(b => b.ticketsSold > 0);
      
      if (configuredBoxes.length === 0) {
        return { success: false, message: 'No sales to save' };
      }

      const totalTicketsSold = configuredBoxes.reduce((sum, b) => sum + b.ticketsSold, 0);
      const totalAmountSold = configuredBoxes.reduce((sum, b) => sum + b.totalAmountSold, 0);

      try {
        // Check if summary exists for today, this state, and this user (upsert)
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('id')
          .eq('summary_date', summaryDate)
          .eq('state_code', stateCode)
          .eq('user_id', user.id)
          .maybeSingle();

        let summaryId: string;

        if (existingSummary) {
          // Update existing summary
          const { error: updateError } = await supabase
            .from('daily_summaries')
            .update({
              total_tickets_sold: totalTicketsSold,
              total_amount_sold: totalAmountSold,
              active_boxes: configuredBoxes.length,
            })
            .eq('id', existingSummary.id);

          if (updateError) throw updateError;
          summaryId = existingSummary.id;

          // Delete old box sales for this summary
          await supabase
            .from('daily_box_sales')
            .delete()
            .eq('summary_id', summaryId);
        } else {
          // Insert new summary with state_code and user_id
          const { data: newSummary, error: insertError } = await supabase
            .from('daily_summaries')
            .insert({
              summary_date: summaryDate,
              day_of_week: dayOfWeek,
              total_tickets_sold: totalTicketsSold,
              total_amount_sold: totalAmountSold,
              active_boxes: configuredBoxes.length,
              state_code: stateCode,
              user_id: user.id,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          summaryId = newSummary.id;
        }

        // Insert box sales with state_code and user_id
        // Fetch the latest box configs from server for accurate last_scanned_ticket_number
        let serverBoxConfigs: Map<number, number | null> = new Map();
        try {
          const { data: boxConfigs } = await supabase
            .from('box_configurations')
            .select('box_number, last_scanned_ticket_number')
            .eq('user_id', user.id)
            .eq('state_code', stateCode);
          if (boxConfigs) {
            for (const config of boxConfigs) {
              serverBoxConfigs.set(config.box_number, config.last_scanned_ticket_number);
            }
          }
        } catch {
          // Use local data as fallback
        }

        const boxSalesData = configuredBoxes.map(box => ({
          summary_id: summaryId,
          box_number: box.boxNumber,
          ticket_price: box.ticketPrice,
          last_scanned_ticket_number: serverBoxConfigs.get(box.boxNumber) ?? box.lastScannedTicketNumber,
          tickets_sold: box.ticketsSold,
          total_amount_sold: box.totalAmountSold,
          state_code: stateCode,
          user_id: user.id,
        }));

        const { error: boxSalesError } = await supabase
          .from('daily_box_sales')
          .insert(boxSalesData);

        if (boxSalesError) throw boxSalesError;

        return { success: true, message: 'Summary saved to history' };
      } catch {
        logErrorSecurely('saveDailySummary');
        return { success: false, message: 'Failed to save summary' };
      }
    };

    // Chain the save operation to prevent concurrent execution
    saveLockRef.current = saveLockRef.current.then(saveOperation).catch(() => saveOperation());
    return saveLockRef.current;
  }, [stateCode, user]);

  // Enter edit mode for historical data
  const enterEditMode = useCallback(() => {
    if (selectedHistoricalData) {
      setEditedBoxSales([...selectedHistoricalData.boxSales]);
      setIsEditMode(true);
    }
  }, [selectedHistoricalData]);

  // Exit edit mode without saving
  const cancelEditMode = useCallback(() => {
    if (selectedHistoricalData) {
      setEditedBoxSales([...selectedHistoricalData.boxSales]);
    }
    setIsEditMode(false);
  }, [selectedHistoricalData]);

  // Update a box sale in edit mode (local state only)
  const updateEditedBoxSale = useCallback((boxNumber: number, updates: Partial<DailyBoxSale>) => {
    setEditedBoxSales(prev => prev.map(sale => 
      sale.box_number === boxNumber 
        ? { ...sale, ...updates, total_amount_sold: (updates.tickets_sold ?? sale.tickets_sold) * sale.ticket_price }
        : sale
    ));
  }, []);

  // Save edits to historical summary
  const saveHistoricalEdits = useCallback(async () => {
    if (!selectedHistoricalData) return { success: false, message: 'No summary selected' };

    try {
      // Calculate new totals
      const totalTicketsSold = editedBoxSales.reduce((sum, b) => sum + b.tickets_sold, 0);
      const totalAmountSold = editedBoxSales.reduce((sum, b) => sum + b.total_amount_sold, 0);

      // Update summary totals
      const { error: summaryError } = await supabase
        .from('daily_summaries')
        .update({
          total_tickets_sold: totalTicketsSold,
          total_amount_sold: totalAmountSold,
        })
        .eq('id', selectedHistoricalData.summary.id);

      if (summaryError) throw summaryError;

      // Update each box sale
      for (const sale of editedBoxSales) {
        const { error: saleError } = await supabase
          .from('daily_box_sales')
          .update({
            tickets_sold: sale.tickets_sold,
            total_amount_sold: sale.total_amount_sold,
            last_scanned_ticket_number: sale.last_scanned_ticket_number,
          })
          .eq('id', sale.id);

        if (saleError) throw saleError;
      }

      // Refresh the data
      await fetchHistoricalSummary(selectedHistoricalData.summary.summary_date);
      setIsEditMode(false);

      return { success: true, message: 'Changes saved successfully' };
    } catch (error) {
      logErrorSecurely('saveHistoricalEdits');
      return { success: false, message: 'Failed to save changes' };
    }
  }, [selectedHistoricalData, editedBoxSales, fetchHistoricalSummary]);

  // Clear selected historical data (return to today's view)
  const clearHistoricalSelection = useCallback(() => {
    setSelectedHistoricalData(null);
    setIsEditMode(false);
    setEditedBoxSales([]);
  }, []);

  // Get unique days of week from history
  const getUniqueDaysOfWeek = useCallback(() => {
    const days = [...new Set(historicalSummaries.map(s => s.day_of_week))];
    return days;
  }, [historicalSummaries]);

  return {
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
  };
};
