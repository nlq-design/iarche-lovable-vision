import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brochure, BrochureSections, defaultSections } from '@/types/brochure';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

const parseSections = (sections: Json | null): BrochureSections => {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    return defaultSections;
  }
  return sections as unknown as BrochureSections;
};

export const useBrochures = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brochures = [], isLoading } = useQuery({
    queryKey: ['brochures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brochures')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(b => ({
        ...b,
        sections: parseSections(b.sections)
      })) as Brochure[];
    },
  });

  const createBrochure = useMutation({
    mutationFn: async (brochure: Partial<Brochure>) => {
      const { data, error } = await supabase
        .from('brochures')
        .insert({
          title: brochure.title!,
          slug: brochure.slug!,
          cover_title: brochure.cover_title!,
          cover_subtitle: brochure.cover_subtitle,
          cover_image_url: brochure.cover_image_url,
          sections: brochure.sections as unknown as Json,
          published: brochure.published || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brochures'] });
      toast({ title: 'Brochure créée avec succès' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateBrochure = useMutation({
    mutationFn: async ({ id, ...brochure }: Partial<Brochure> & { id: string }) => {
      const { data, error } = await supabase
        .from('brochures')
        .update({
          title: brochure.title,
          slug: brochure.slug,
          cover_title: brochure.cover_title,
          cover_subtitle: brochure.cover_subtitle,
          cover_image_url: brochure.cover_image_url,
          sections: brochure.sections as unknown as Json,
          published: brochure.published,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brochures'] });
      toast({ title: 'Brochure mise à jour' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBrochure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brochures')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brochures'] });
      toast({ title: 'Brochure supprimée' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  return {
    brochures,
    isLoading,
    createBrochure,
    updateBrochure,
    deleteBrochure,
  };
};

export const useBrochure = (id?: string) => {
  return useQuery({
    queryKey: ['brochure', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('brochures')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        sections: parseSections(data.sections)
      } as Brochure;
    },
    enabled: !!id,
  });
};

export const useBrochureBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ['brochure-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('brochures')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        sections: parseSections(data.sections)
      } as Brochure;
    },
    enabled: !!slug,
  });
};
