import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PappersCompanyResult {
  siren: string;
  siret: string;
  nom_entreprise: string;
  ville?: string;
  code_postal?: string;
  code_naf?: string;
  libelle_naf?: string;
}

export interface PappersEnrichedData {
  found: boolean;
  siren?: string;
  siret?: string;
  company_name?: string;
  legal_form?: string;
  creation_date?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  naf_code?: string;
  naf_label?: string;
  industry?: string;
  employees?: string;
  employees_range?: string;
  employees_min?: number;
  employees_max?: number;
  capital?: number;
  revenue?: number;
  profit?: number;
  website?: string;
  object_social?: string;
  rcs_status?: string;
  representatives?: Array<{
    name: string;
    position: string;
    since?: string;
  }>;
  finances?: Array<{
    annee: number;
    chiffre_affaires?: number;
    resultat?: number;
    effectif?: number;
  }>;
  coordinates?: { lat: number; lng: number };
  lead_updated?: boolean;
}

export interface PappersSearchResult {
  found: boolean;
  count: number;
  results: PappersCompanyResult[];
}

export function usePappersLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCompanies = async (query: string): Promise<PappersSearchResult | null> => {
    if (!query || query.length < 2) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('pappers-lookup', {
        body: { q: query },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as PappersSearchResult;
    } catch (err: any) {
      console.error('Pappers search error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const lookupBySiret = async (siret: string, leadId?: string): Promise<PappersEnrichedData | null> => {
    if (!siret || siret.length < 9) {
      toast.error('SIRET invalide (9-14 chiffres requis)');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('pappers-lookup', {
        body: { siret: siret.replace(/\s/g, ''), lead_id: leadId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.found === false) {
        toast.error('Entreprise non trouvée');
        return null;
      }

      if (data.lead_updated) {
        toast.success('Lead enrichi avec les données Pappers');
      }

      return data as PappersEnrichedData;
    } catch (err: any) {
      console.error('Pappers SIRET lookup error:', err);
      setError(err.message);
      toast.error(`Erreur Pappers: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const lookupBySiren = async (siren: string, leadId?: string): Promise<PappersEnrichedData | null> => {
    if (!siren || siren.length !== 9) {
      toast.error('SIREN invalide (9 chiffres requis)');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('pappers-lookup', {
        body: { siren, lead_id: leadId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.found === false) {
        toast.error('Entreprise non trouvée');
        return null;
      }

      if (data.lead_updated) {
        toast.success('Lead enrichi avec les données Pappers');
      }

      return data as PappersEnrichedData;
    } catch (err: any) {
      console.error('Pappers SIREN lookup error:', err);
      setError(err.message);
      toast.error(`Erreur Pappers: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const enrichLead = async (leadId: string, siret: string): Promise<boolean> => {
    const result = await lookupBySiret(siret, leadId);
    return result?.lead_updated === true;
  };

  return {
    searchCompanies,
    lookupBySiret,
    lookupBySiren,
    enrichLead,
    isLoading,
    error,
  };
}
