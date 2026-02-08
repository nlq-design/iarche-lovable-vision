import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SentinelAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'incomplete' | 'inconsistency' | 'inactivity';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  question: string;
  detail: string;
}

interface SentinelState {
  alerts: SentinelAlert[];
  total: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAISentinel() {
  const [state, setState] = useState<SentinelState>({
    alerts: [],
    total: 0,
    isLoading: false,
    error: null,
    lastFetched: null,
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchAlerts = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('ai-sentinel', { body: {} });
      if (error) throw error;
      setState(prev => ({
        ...prev,
        alerts: data?.alerts || [],
        total: data?.total || 0,
        isLoading: false,
        lastFetched: new Date(),
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err?.message || String(err) }));
    }
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedIds(prev => new Set(prev).add(alertId));
  }, []);

  const activeAlerts = state.alerts.filter(a => !dismissedIds.has(a.id));

  // Initial fetch + polling
  useEffect(() => {
    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAlerts]);

  return {
    alerts: activeAlerts,
    total: state.total,
    isLoading: state.isLoading,
    error: state.error,
    lastFetched: state.lastFetched,
    dismissAlert,
    refresh: fetchAlerts,
  };
}
