import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MeetingPrepContact {
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
}

export interface MeetingPrepHistory {
  date: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  summary: string;
}

export interface MeetingPrepTalkingPoint {
  topic: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export interface MeetingPrepRisk {
  description: string;
  mitigation: string;
}

export interface MeetingPrepAction {
  action: string;
  timing: 'before' | 'during' | 'after';
  rationale: string;
}

export interface MeetingPrepData {
  meeting: {
    id: string;
    title: string;
    date: string;
    type: 'discovery' | 'follow-up' | 'closing' | 'review';
    contact: MeetingPrepContact;
  };
  context: {
    opportunityName: string;
    opportunityStage: string;
    opportunityValue: number;
    daysSinceLastContact: number;
    totalInteractions: number;
  };
  history: MeetingPrepHistory[];
  talkingPoints: MeetingPrepTalkingPoint[];
  risks: MeetingPrepRisk[];
  suggestedActions: MeetingPrepAction[];
}

export function useMeetingPrep(bookingId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting-prep', user?.id, bookingId],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'meeting-prep',
          ...(bookingId ? { bookingId } : {}),
        },
      });

      if (response.error) throw response.error;
      return response.data as MeetingPrepData;
    },
    staleTime: 2 * 60 * 60 * 1000, // 2h cache
    refetchOnWindowFocus: false,
    enabled: false, // Lazy load
  });
}
