import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CockpitAuthState {
  hasCockpitAccess: boolean;
  hasCockpitAdminAccess: boolean;
  isStepUpVerified: boolean;
  stepUpExpiresAt: Date | null;
  loading: boolean;
  mfaEnabled: boolean;
}

export const useCockpitAuth = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CockpitAuthState>({
    hasCockpitAccess: false,
    hasCockpitAdminAccess: false,
    isStepUpVerified: false,
    stepUpExpiresAt: null,
    loading: true,
    mfaEnabled: false,
  });

  const checkCockpitAccess = useCallback(async () => {
    if (!user) {
      setState({
        hasCockpitAccess: false,
        hasCockpitAdminAccess: false,
        isStepUpVerified: false,
        stepUpExpiresAt: null,
        loading: false,
        mfaEnabled: false,
      });
      return;
    }

    try {
      // Check cockpit roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasCockpitUser = roles?.some(r => r.role === 'cockpit_user') ?? false;
      const hasCockpitAdmin = roles?.some(r => r.role === 'cockpit_admin') ?? false;
      const hasCockpitAccess = hasCockpitUser || hasCockpitAdmin;

      // Check MFA status
      const { data: { totp } } = await supabase.auth.mfa.listFactors();
      const mfaEnabled = totp && totp.length > 0 && totp.some(f => f.status === 'verified');

      // Auto-create session for cockpit users if they have access
      if (hasCockpitAccess) {
        await supabase.rpc('ensure_cockpit_session', { user_uuid: user.id });
      }

      // Check step-up session (should now exist after ensure_cockpit_session)
      const { data: session } = await supabase
        .from('cockpit_auth_sessions')
        .select('expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      let isStepUpVerified = false;
      let stepUpExpiresAt: Date | null = null;

      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at);
        if (expiresAt > new Date()) {
          isStepUpVerified = true;
          stepUpExpiresAt = expiresAt;
        }
      }

      setState({
        hasCockpitAccess,
        hasCockpitAdminAccess: hasCockpitAdmin,
        isStepUpVerified,
        stepUpExpiresAt,
        loading: false,
        mfaEnabled: mfaEnabled ?? false,
      });
    } catch (error) {
      console.error('Error checking cockpit access:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkCockpitAccess();
  }, [checkCockpitAccess]);

  const refreshStepUp = useCallback(async () => {
    await checkCockpitAccess();
  }, [checkCockpitAccess]);

  const recordStepUpSuccess = useCallback(async () => {
    if (!user) return false;

    try {
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      const { error } = await supabase
        .from('cockpit_auth_sessions')
        .upsert(
          {
            user_id: user.id,
            verified_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            mfa_method: 'totp',
            stepup_reason: 'cockpit_access',
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isStepUpVerified: true,
        stepUpExpiresAt: expiresAt,
      }));

      return true;
    } catch (error) {
      console.error('Error recording step-up:', error);
      return false;
    }
  }, [user]);

  const recordMfaAttempt = useCallback(async (success: boolean, failureReason?: string) => {
    if (!user) return;

    try {
      await supabase.from('cockpit_mfa_attempts').insert({
        user_id: user.id,
        success,
        failure_reason: failureReason || null,
      });
    } catch (error) {
      console.error('Error recording MFA attempt:', error);
    }
  }, [user]);

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_cockpit_mfa_rate_limit', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }, [user]);

  return {
    ...state,
    refreshStepUp,
    recordStepUpSuccess,
    recordMfaAttempt,
    checkRateLimit,
  };
};
