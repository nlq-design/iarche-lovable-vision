import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AutoConsulteState {
  isRunning: boolean;
  lastResult: { processed: number; success: number; failed: number } | null;
  error: string | null;
}

export function useAutoConsulte() {
  const [state, setState] = useState<AutoConsulteState>({
    isRunning: false,
    lastResult: null,
    error: null,
  });

  const triggerAutoConsulte = useCallback(async () => {
    setState(prev => ({ ...prev, isRunning: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('auto-consulte-stale', {
        body: {},
      });
      if (error) throw error;
      setState({ isRunning: false, lastResult: data, error: null });
      return data;
    } catch (err: any) {
      const msg = err?.message || String(err);
      setState(prev => ({ ...prev, isRunning: false, error: msg }));
      throw err;
    }
  }, []);

  const triggerAutoHarvest = useCallback(async () => {
    setState(prev => ({ ...prev, isRunning: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('auto-harvest-daily', {
        body: {},
      });
      if (error) throw error;
      setState({ isRunning: false, lastResult: data, error: null });
      return data;
    } catch (err: any) {
      const msg = err?.message || String(err);
      setState(prev => ({ ...prev, isRunning: false, error: msg }));
      throw err;
    }
  }, []);

  return { ...state, triggerAutoConsulte, triggerAutoHarvest };
}
