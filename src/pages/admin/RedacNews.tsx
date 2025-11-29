import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Mail, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Newsletter {
  id: string;
  subject: string;
  content: string;
  status: 'draft' | 'ready' | 'sent';
  created_at: string;
  updated_at: string;
  author_id: string | null;
}

const RedacNews = () => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'ready'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewNewsletter, setPreviewNewsletter] = useState<Newsletter | null>(null);
  
  const { toast } = useToast();

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  };

  const loadNewsletters = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsletters((data || []) as Newsletter[]);
    } catch (error) {
      console.error('Error loading newsletters:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les newsletters",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewsletters();
  }, []);

  const handleSave = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le sujet et le contenu",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // Update existing newsletter
        const { error } = await supabase
          .from('newsletters')
          .update({
            subject,
            content,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: "Mise à jour réussie",
          description: "Newsletter mise à jour"
        });
      } else {
        // Create new newsletter
        const { error } = await supabase
          .from('newsletters')
          .insert({
            subject,
            content,
            status
          });

        if (error) throw error;
        toast({
          title: "Sauvegardée",
          description: `Newsletter enregistrée en ${status === 'draft' ? 'brouillon' : 'prête'}`
        });
      }

      // Reset form
      setSubject('');
      setContent('');
      setStatus('draft');
      setEditingId(null);
      
      // Reload newsletters
      loadNewsletters();
    } catch (error) {
      console.error('Error saving newsletter:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (newsletter: Newsletter) => {
    setEditingId(newsletter.id);
    setSubject(newsletter.subject);
    setContent(newsletter.content);
    setStatus(newsletter.status === 'sent' ? 'ready' : newsletter.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette newsletter ?')) return;

    try {
      const { error } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Supprimée",
        description: "Newsletter supprimée"
      });
      
      loadNewsletters();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setSubject('');
    setContent('');
    setStatus('draft');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      ready: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800'
    };
    const labels = {
      draft: 'Brouillon',
      ready: 'Prête',
      sent: 'Envoyée'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>RedacNews · Newsletters · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">RedacNews</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos newsletters. L'envoi via Brevo sera disponible en V2.
          </p>
        </div>
        
        {/* Editor Section */}
        <section className="bg-background border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier la newsletter' : 'Nouvelle newsletter'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Objet de l'email *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Nouveautés IA de mars 2025"
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Contenu *
              </label>
              <div className="border border-border rounded-lg overflow-hidden">
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  theme="snow"
                  className="bg-background"
                  placeholder="Rédigez le contenu de votre newsletter..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'ready')}
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
              >
                <option value="draft">Brouillon</option>
                <option value="ready">Prête à envoyer</option>
              </select>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !subject.trim() || !content.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
                {editingId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
              
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </section>
        
        {/* Newsletters List */}
        <section className="bg-background border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Newsletters enregistrées</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : newsletters.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Aucune newsletter enregistrée
            </p>
          ) : (
            <div className="space-y-4">
              {newsletters.map((newsletter) => (
                <div
                  key={newsletter.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{newsletter.subject}</h3>
                        {getStatusBadge(newsletter.status)}
                      </div>
                      <div 
                        className="text-sm text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: newsletter.content }}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Créée le {new Date(newsletter.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewNewsletter(newsletter)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                        title="Prévisualiser"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(newsletter)}
                        className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-background transition-colors"
                      >
                        Modifier
                      </button>
                      {newsletter.status !== 'sent' && (
                        <button
                          onClick={() => handleDelete(newsletter.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Preview Modal */}
        {previewNewsletter && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewNewsletter(null)}
          >
            <div 
              className="bg-background border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Prévisualisation</h2>
                <button
                  onClick={() => setPreviewNewsletter(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Objet</p>
                  <p className="font-medium">{previewNewsletter.subject}</p>
                </div>
                
                <div className="border-t pt-4">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewNewsletter.content }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RedacNews;
