import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, Download, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ArticleStatsInlineProps {
  articleId: string;
  resourceType: string;
}

interface Stats {
  views: number;
  comments: number;
  downloads: number;
  inscriptions: number;
}

export const ArticleStatsInline = ({ articleId, resourceType }: ArticleStatsInlineProps) => {
  const [stats, setStats] = useState<Stats>({
    views: 0,
    comments: 0,
    downloads: 0,
    inscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Views
        const { count: viewsCount } = await supabase
          .from('article_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', articleId);

        // Comments
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', articleId);

        // Downloads (for livre-blanc)
        const { data: articleData } = await supabase
          .from('articles')
          .select('compteur_telechargements')
          .eq('id', articleId)
          .single();

        // Inscriptions (for atelier-webinaire)
        let inscriptionsCount = 0;
        if (resourceType === 'atelier-webinaire') {
          const { data, error } = await supabase.rpc('count_atelier_inscriptions', {
            atelier_uuid: articleId,
          });
          if (!error && data !== null) {
            inscriptionsCount = data;
          }
        }

        setStats({
          views: viewsCount || 0,
          comments: commentsCount || 0,
          downloads: articleData?.compteur_telechargements || 0,
          inscriptions: inscriptionsCount,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Real-time subscription for views and comments
    const viewsChannel = supabase
      .channel(`article-views-${articleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'article_views',
          filter: `article_id=eq.${articleId}`,
        },
        () => {
          setStats(prev => ({ ...prev, views: prev.views + 1 }));
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`article-comments-${articleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `article_id=eq.${articleId}`,
        },
        () => {
          setStats(prev => ({ ...prev, comments: prev.comments + 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [articleId, resourceType]);

  if (loading) {
    return (
      <Card className="mb-6 bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 animate-pulse" />
            Chargement des statistiques...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasStats = stats.views > 0 || stats.comments > 0 || stats.downloads > 0 || stats.inscriptions > 0;

  if (!hasStats) {
    return null;
  }

  return (
    <Card className="mb-6 border-accent/20 bg-accent/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Performance de l'article</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.views > 0 && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              {stats.views} vues
            </Badge>
          )}
          {stats.comments > 0 && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              {stats.comments} commentaires
            </Badge>
          )}
          {resourceType === 'livre-blanc' && stats.downloads > 0 && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5" />
              {stats.downloads} téléchargements
            </Badge>
          )}
          {resourceType === 'atelier-webinaire' && stats.inscriptions > 0 && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {stats.inscriptions} inscriptions
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
