import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerLoginEntry {
  id: string;
  partner_id: string;
  user_id: string;
  logged_in_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  session_duration_minutes: number | null;
  logout_at: string | null;
}

export interface LoginStats {
  totalLogins: number;
  lastLoginAt: string | null;
  uniqueDevices: number;
  recentLogins: number; // last 7 days
}

export function usePartnerLoginHistory(partnerId: string | undefined) {
  const historyQuery = useQuery({
    queryKey: ['partner-login-history', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      
      const { data, error } = await supabase
        .from('partner_login_history')
        .select('*')
        .eq('partner_id', partnerId)
        .order('logged_in_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PartnerLoginEntry[];
    },
    enabled: !!partnerId,
  });

  const statsQuery = useQuery({
    queryKey: ['partner-login-stats', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      
      const { data, error } = await supabase
        .from('partner_login_history')
        .select('id, logged_in_at, device_type')
        .eq('partner_id', partnerId);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          totalLogins: 0,
          lastLoginAt: null,
          uniqueDevices: 0,
          recentLogins: 0,
        } as LoginStats;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const uniqueDevices = new Set(data.map(d => d.device_type).filter(Boolean)).size;
      const recentLogins = data.filter(d => new Date(d.logged_in_at) >= sevenDaysAgo).length;
      const sortedByDate = [...data].sort((a, b) => 
        new Date(b.logged_in_at).getTime() - new Date(a.logged_in_at).getTime()
      );

      return {
        totalLogins: data.length,
        lastLoginAt: sortedByDate[0]?.logged_in_at || null,
        uniqueDevices,
        recentLogins,
      } as LoginStats;
    },
    enabled: !!partnerId,
  });

  return {
    history: historyQuery.data ?? [],
    stats: statsQuery.data,
    isLoading: historyQuery.isLoading || statsQuery.isLoading,
    error: historyQuery.error || statsQuery.error,
  };
}
