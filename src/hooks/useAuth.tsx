import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface SignUpParams {
  email: string;
  password: string;
  invite_code: string;
  workspace_name?: string;
}

interface ResetPasswordParams {
  email: string;
}

interface UpdatePasswordParams {
  password: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Subscribe FIRST to avoid missing the initial event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      // Defer admin role check to avoid deadlock inside the listener
      if (nextSession?.user) {
        setTimeout(() => {
          checkAdminRole(nextSession.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // 2) THEN read the existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        checkAdminRole(existing.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const query = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      const { data, error } = await Promise.race([query, timeout]);
      setIsAdmin(!error && data !== null);
    } catch {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signUp = useCallback(
    async ({ email, password, invite_code, workspace_name }: SignUpParams) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { invite_code, workspace_name: workspace_name ?? null },
        },
      });
      return { data, error };
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { data, error };
  }, []);

  const resetPassword = useCallback(async ({ email }: ResetPasswordParams) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?mode=update`,
    });
    return { data, error };
  }, []);

  const updatePassword = useCallback(async ({ password }: UpdatePasswordParams) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    signOut,
  };
};
