import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  ai_source: string;
  created_at: string;
}

const DraftsList = () => {
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, excerpt, status, ai_source, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
    } else {
      setDrafts(data || []);
    }
    setLoading(false);
  };

  const handlePublish = async (id: string) => {
    const { error } = await supabase
      .from('articles')
      .update({ 
        status: 'published', 
        published_at: new Date().toISOString(),
        published: true 
      })
      .eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de publier", variant: "destructive" });
    } else {
      toast({ title: "Publié !", description: "L'article est maintenant visible" });
      fetchDrafts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce brouillon ?')) return;
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    } else {
      toast({ title: "Supprimé" });
      fetchDrafts();
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucun brouillon</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <div key={draft.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{draft.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                draft.ai_source === 'claude' ? 'bg-[#D97706]/10 text-[#D97706]' : 
                draft.ai_source === 'gpt' ? 'bg-[#10A37F]/10 text-[#10A37F]' : 
                'bg-muted text-muted-foreground'
              }`}>
                {draft.ai_source || 'manuel'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{draft.excerpt}</p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handlePublish(draft.id)}
              className="p-2 hover:bg-green-50 text-green-600 rounded-lg"
              title="Publier"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(draft.id)}
              className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DraftsList;
