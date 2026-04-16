import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function usePartnerAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isPartner, setIsPartner] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<{
    name: string;
    email: string | null;
    partner_type: string;
    partner_subtype: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if we've already logged this session to avoid duplicate entries
  const hasLoggedLogin = useRef<string | null>(null);

  useEffect(() => {
    async function checkPartnerAccess() {
      if (authLoading) return;
      
      if (!user) {
        setIsPartner(false);
        setPartnerId(null);
        setPartnerData(null);
        setLoading(false);
        hasLoggedLogin.current = null;
        return;
      }

      try {
        // Check if user has partner role
        const { data: hasRole } = await supabase.rpc('is_partner_user');
        
        if (!hasRole) {
          setIsPartner(false);
          setPartnerId(null);
          setPartnerData(null);
          setLoading(false);
          return;
        }

        // Get partner profile linked to this user
        const { data: partner, error } = await supabase
          .from('partners')
          .select('id, name, email, partner_type, partner_subtype, avatar_url')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();

        if (error || !partner) {
          console.error('Partner profile not found:', error);
          setIsPartner(false);
          setPartnerId(null);
          setPartnerData(null);
        } else {
          setIsPartner(true);
          setPartnerId(partner.id);
          setPartnerData({
            name: partner.name,
            email: partner.email,
            partner_type: partner.partner_type,
            partner_subtype: partner.partner_subtype,
            avatar_url: partner.avatar_url,
          });
          
          // Log partner login (only once per session)
          if (hasLoggedLogin.current !== partner.id) {
            hasLoggedLogin.current = partner.id;
            
            // Call the log_partner_login function
            try {
              await supabase.rpc('log_partner_login', {
                p_partner_id: partner.id,
                p_user_id: user.id,
                p_ip_address: null, // We can't get IP from client side
                p_user_agent: navigator.userAgent
              });
              console.log('Partner login logged successfully');
            } catch (logError) {
              console.error('Failed to log partner login:', logError);
              // Don't block the login flow if logging fails
            }
          }
        }
      } catch (err) {
        console.error('Error checking partner access:', err);
        setIsPartner(false);
        setPartnerId(null);
        setPartnerData(null);
      } finally {
        setLoading(false);
      }
    }

    checkPartnerAccess();
  }, [user, authLoading]);

  return {
    user,
    isPartner,
    partnerId,
    partnerData,
    loading: authLoading || loading,
  };
}
