import { useState, useEffect, useCallback } from 'react';
import { StoreSettings, DEFAULT_SETTINGS, StateCode, TicketOrder } from '@/types/settings';
import { logErrorSecurely } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useStoreSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch settings from server on mount and when user changes
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            stateCode: data.state_code as StateCode,
            ticketOrder: data.ticket_order as TicketOrder,
          });
        } else {
          // No settings exist, create default settings for this user
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              state_code: DEFAULT_SETTINGS.stateCode,
              ticket_order: DEFAULT_SETTINGS.ticketOrder,
            });

          if (insertError) throw insertError;
          setSettings(DEFAULT_SETTINGS);
        }
      } catch {
        logErrorSecurely('fetchSettings');
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Sync settings to server
  const syncSettingsToServer = useCallback(async (newSettings: StoreSettings) => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          state_code: newSettings.stateCode,
          ticket_order: newSettings.ticketOrder,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    } catch {
      logErrorSecurely('syncSettingsToServer');
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const updateStateCode = useCallback((stateCode: StateCode) => {
    setSettings(prev => {
      const newSettings = { ...prev, stateCode };
      syncSettingsToServer(newSettings);
      return newSettings;
    });
  }, [syncSettingsToServer]);

  const updateTicketOrder = useCallback((ticketOrder: TicketOrder) => {
    setSettings(prev => {
      const newSettings = { ...prev, ticketOrder };
      syncSettingsToServer(newSettings);
      return newSettings;
    });
  }, [syncSettingsToServer]);

  return {
    settings,
    isLoading,
    isSyncing,
    updateStateCode,
    updateTicketOrder,
  };
};
