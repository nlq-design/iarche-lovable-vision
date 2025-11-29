import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ArticlePreviewCard from '@/components/admin/ArticlePreviewCard';
import PreviewModal from '@/components/admin/PreviewModal';
import DraftsList from '@/components/admin/DraftsList';

interface FAQ {
  question: string;
  answer: string;
}

interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
  faq: FAQ[];
  metaTitle: string;
  metaDescription: string;
  tags: string[];
}

const Redacia = () => {
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<'expert' | 'vulgarise' | 'technique'>('expert');
  const [length, setLength] = useState<'court' | 'moyen' | 'long'>('moyen');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAI, setActiveAI] = useState<'claude' | 'gpt' | null>(null);
  
  const [claudeResult, setClaudeResult] = useState<GeneratedArticle | null>(null);
  const [gptResult, setGptResult] = useState<GeneratedArticle | null>(null);
  
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<GeneratedArticle | null>(null);
  
  const { toast } = useToast();

  const handleGenerate = async (ai: 'claude' | 'gpt') => {
    if (!brief.trim()) {
      toast({ title: "Brief requis", description: "Veuillez saisir un sujet", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setActiveAI(ai);

    try {
      const functionName = ai === 'claude' ? 'generate-article-claude' : 'generate-article-gpt';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { brief, tone, length }
      });

      if (error) throw error;

      if (ai === 'claude') {
        setClaudeResult(data);
      } else {
        setGptResult(data);
      }

      toast({ title: "Généré !", description: `Article généré avec ${ai === 'claude' ? 'Claude' : 'GPT'}` });
    } catch (error) {
      console.error('Error generating article:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de générer l'article", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
      setActiveAI(null);
    }
  };

  const handleSave = async (article: GeneratedArticle, source: 'claude' | 'gpt') => {
    try {
      const slug = article.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { error } = await supabase.from('articles').insert({
        title: article.title,
        slug,
        excerpt: article.excerpt,
        content: article.content,
        faq: article.faq as any,
        status: 'draft',
        ai_source: source,
        author: 'IArche',
        tags: article.tags,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        published: false
      });

      if (error) throw error;

      toast({ title: "Sauvegardé !", description: "Article enregistré en brouillon" });
      
      if (source === 'claude') {
        setClaudeResult(null);
      } else {
        setGptResult(null);
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de sauvegarder", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Redacia · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Redacia</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Admin</span>
          </div>
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Retour au site
          </a>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <section className="bg-background border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Nouveau brief</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Sujet / Idée / Brief *
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Ex: Écrire un article sur l'implémentation CLM pour les directions juridiques. Points clés : phases du projet, facteurs de succès, rôle du Legal Ops..."
                rows={4}
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none bg-background"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ton</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
                >
                  <option value="expert">Expert (B2B, décideurs)</option>
                  <option value="vulgarise">Vulgarisé (grand public)</option>
                  <option value="technique">Technique (développeurs)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Longueur</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as any)}
                  className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
                >
                  <option value="court">Court (~800 mots)</option>
                  <option value="moyen">Moyen (~1500 mots)</option>
                  <option value="long">Long (~2500 mots)</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => handleGenerate('claude')}
                disabled={!brief.trim() || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-[#D97706] text-white px-6 py-3 rounded-lg hover:bg-[#B45309] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating && activeAI === 'claude' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                Générer avec Claude
              </button>
              
              <button
                onClick={() => handleGenerate('gpt')}
                disabled={!brief.trim() || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-[#10A37F] text-white px-6 py-3 rounded-lg hover:bg-[#0D8A6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating && activeAI === 'gpt' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                Générer avec GPT
              </button>
            </div>
          </div>
        </section>
        
        {(claudeResult || gptResult) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Arena — Comparaison</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`border rounded-xl p-6 ${claudeResult ? 'border-[#D97706] bg-[#D97706]/5' : 'border-border bg-muted/20'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[#D97706]"></span>
                  <h3 className="font-semibold">Claude</h3>
                </div>
                
                {claudeResult ? (
                  <ArticlePreviewCard 
                    article={claudeResult} 
                    onPreview={() => { setSelectedArticle(claudeResult); setPreviewMode(true); }}
                    onSave={() => handleSave(claudeResult, 'claude')}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">Pas encore généré</p>
                )}
              </div>
              
              <div className={`border rounded-xl p-6 ${gptResult ? 'border-[#10A37F] bg-[#10A37F]/5' : 'border-border bg-muted/20'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[#10A37F]"></span>
                  <h3 className="font-semibold">GPT-4</h3>
                </div>
                
                {gptResult ? (
                  <ArticlePreviewCard 
                    article={gptResult} 
                    onPreview={() => { setSelectedArticle(gptResult); setPreviewMode(true); }}
                    onSave={() => handleSave(gptResult, 'gpt')}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">Pas encore généré</p>
                )}
              </div>
            </div>
          </section>
        )}
        
        <section>
          <h2 className="text-lg font-semibold mb-4">Brouillons</h2>
          <DraftsList />
        </section>
        
      </main>
      
      {previewMode && selectedArticle && (
        <PreviewModal 
          article={selectedArticle} 
          onClose={() => setPreviewMode(false)} 
        />
      )}
    </div>
  );
};

export default Redacia;
