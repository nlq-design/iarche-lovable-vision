import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DuplicationHandlerProps {
  isNewArticle: boolean;
  onDuplicate: (data: any) => void;
  setLoading: (loading: boolean) => void;
}

export const DuplicationHandler = ({ isNewArticle, onDuplicate, setLoading }: DuplicationHandlerProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isNewArticle) return;

    const params = new URLSearchParams(location.search);
    const duplicateId = params.get('duplicate');
    
    if (duplicateId) {
      handleDuplicate(duplicateId);
    }
  }, [isNewArticle, location.search]);

  const handleDuplicate = async (sourceId: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) throw error;

      // Load categories and tags
      const { data: articleCategories } = await supabase
        .from('article_categories')
        .select('category_id')
        .eq('article_id', sourceId);

      const { data: articleTags } = await supabase
        .from('article_tags')
        .select('tag_id')
        .eq('article_id', sourceId);

      onDuplicate({
        ...data,
        title: `${data.title} (copie)`,
        slug: '',
        status: 'draft',
        categories: articleCategories?.map(ac => ac.category_id) || [],
        tags: articleTags?.map(at => at.tag_id) || [],
      });

      toast({
        title: 'Article dupliqué',
        description: 'Modifiez le contenu et enregistrez pour créer la copie',
      });
    } catch (error) {
      console.error('Error duplicating article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer l\'article',
        variant: 'destructive',
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  return null;
};
