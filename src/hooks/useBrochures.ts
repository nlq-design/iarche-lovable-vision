import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brochure, BrochureSections, BrochureCustomColors, defaultSections } from '@/types/brochure';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

const parseSections = (sections: Json | null): BrochureSections => {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    return defaultSections;
  }
  return sections as unknown as BrochureSections;
};

const parseCustomColors = (colors: Json | null): BrochureCustomColors => {
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
    return { primary: null, accent: null };
  }
  return colors as unknown as BrochureCustomColors;
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
        sections: parseSections(b.sections),
        custom_colors: parseCustomColors(b.custom_colors),
        views_count: b.views_count || 0,
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
          custom_colors: brochure.custom_colors as unknown as Json,
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
          custom_colors: brochure.custom_colors as unknown as Json,
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

  const duplicateBrochure = useMutation({
    mutationFn: async (brochure: Brochure) => {
      const { data, error } = await supabase
        .from('brochures')
        .insert({
          title: `${brochure.title} (copie)`,
          slug: `${brochure.slug}-copie-${Date.now()}`,
          cover_title: brochure.cover_title,
          cover_subtitle: brochure.cover_subtitle,
          cover_image_url: brochure.cover_image_url,
          sections: brochure.sections as unknown as Json,
          custom_colors: brochure.custom_colors as unknown as Json,
          published: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brochures'] });
      toast({ title: 'Brochure dupliquée' });
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
    duplicateBrochure,
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
        sections: parseSections(data.sections),
        custom_colors: parseCustomColors(data.custom_colors),
        views_count: data.views_count || 0,
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
      
      // Increment views
      supabase.from('brochures').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then();
      
      return {
        ...data,
        sections: parseSections(data.sections),
        custom_colors: parseCustomColors(data.custom_colors),
        views_count: data.views_count || 0,
      } as Brochure;
    },
    enabled: !!slug,
  });
};
