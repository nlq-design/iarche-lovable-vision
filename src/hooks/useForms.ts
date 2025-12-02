import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormSettings, DEFAULT_FORM_SETTINGS } from '@/types/forms';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Générer un slug unique
const generateSlug = (title: string): string => {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
};

// Helper pour convertir les données Supabase en Form
const parseForm = (data: any): Form => ({
  ...data,
  fields: Array.isArray(data.fields) ? data.fields : [],
  settings: data.settings as FormSettings || DEFAULT_FORM_SETTINGS
});

export const useForms = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Liste tous les formulaires
  const getForms = useCallback(async (): Promise<Form[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(parseForm);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les formulaires', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Récupère un formulaire par ID
  const getFormById = useCallback(async (id: string): Promise<Form | null> => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return parseForm(data);
    } catch (error) {
      return null;
    }
  }, []);

  // Récupère un formulaire par slug (pour page publique)
  const getFormBySlug = useCallback(async (slug: string): Promise<Form | null> => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return parseForm(data);
    } catch (error) {
      return null;
    }
  }, []);

  // Crée un nouveau formulaire
  const createForm = useCallback(async (title: string): Promise<Form | null> => {
    setLoading(true);
    try {
      const slug = generateSlug(title);
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title,
          slug,
          fields: [] as unknown as Json,
          settings: DEFAULT_FORM_SETTINGS as unknown as Json
        })
        .select()
        .single();
      
      if (error) throw error;
      toast({ title: 'Succès', description: 'Formulaire créé' });
      return parseForm(data);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de créer le formulaire', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Met à jour un formulaire
  const updateForm = useCallback(async (id: string, updates: Partial<Form>): Promise<boolean> => {
    try {
      // Convertir pour Supabase
      const supabaseUpdates: Record<string, any> = { ...updates };
      if (updates.fields) {
        supabaseUpdates.fields = updates.fields as unknown as Json;
      }
      if (updates.settings) {
        supabaseUpdates.settings = updates.settings as unknown as Json;
      }

      const { error } = await supabase
        .from('forms')
        .update(supabaseUpdates)
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Supprime un formulaire
  const deleteForm = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Succès', description: 'Formulaire supprimé' });
      return true;
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Duplique un formulaire
  const duplicateForm = useCallback(async (id: string): Promise<Form | null> => {
    setLoading(true);
    try {
      const original = await getFormById(id);
      if (!original) throw new Error('Formulaire non trouvé');
      
      const newSlug = generateSlug(`${original.title} (copie)`);
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: `${original.title} (copie)`,
          slug: newSlug,
          description: original.description,
          fields: original.fields as unknown as Json,
          settings: original.settings as unknown as Json
        })
        .select()
        .single();
      
      if (error) throw error;
      toast({ title: 'Succès', description: 'Formulaire dupliqué' });
      return parseForm(data);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de dupliquer', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [getFormById, toast]);

  // Toggle actif/inactif
  const toggleFormActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return updateForm(id, { is_active: isActive });
  }, [updateForm]);

  return {
    loading,
    getForms,
    getFormById,
    getFormBySlug,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
    toggleFormActive
  };
};
