import { useState, useEffect, useCallback } from 'react';
import { StoreSettings, DEFAULT_SETTINGS, StateCode, TicketOrder } from '@/types/settings';
import { logErrorSecurely } from '@/lib/errorHandler';

const SETTINGS_STORAGE_KEY = 'scratchoff-store-settings';

const loadSettings = (): StoreSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    logErrorSecurely('loadSettings');
  }
  return DEFAULT_SETTINGS;
};

export const useStoreSettings = () => {
  const [settings, setSettings] = useState<StoreSettings>(loadSettings);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      logErrorSecurely('saveSettings');
    }
  }, [settings]);

  const updateStateCode = useCallback((stateCode: StateCode) => {
    setSettings(prev => ({ ...prev, stateCode }));
  }, []);

  const updateTicketOrder = useCallback((ticketOrder: TicketOrder) => {
    setSettings(prev => ({ ...prev, ticketOrder }));
  }, []);

  return {
    settings,
    updateStateCode,
    updateTicketOrder,
  };
};
