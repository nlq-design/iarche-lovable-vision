import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ArticlePreviewCard from '@/components/admin/ArticlePreviewCard';
import PreviewModal from '@/components/admin/PreviewModal';
import DraftsList from '@/components/admin/DraftsList';
import AdminLayout from '@/components/layouts/AdminLayout';

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

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultTone: 'expert' | 'vulgarise' | 'technique';
  defaultLength: 'court' | 'moyen' | 'long';
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'custom',
    name: 'Brief personnalisé',
    description: 'Rédigez votre propre brief',
    prompt: '',
    defaultTone: 'expert',
    defaultLength: 'moyen'
  },
  {
    id: 'tutorial',
    name: 'Tutoriel pratique',
    description: 'Guide étape par étape pour implémenter une solution IA',
    prompt: `Rédige un tutoriel pratique détaillé pour : [SUJET]

Structure attendue :
- Introduction : contexte et bénéfices
- Prérequis techniques et organisationnels
- Étapes détaillées avec captures/exemples
- Conseils pratiques et pièges à éviter
- Checklist de validation
- Ressources complémentaires

Ton : pédagogique et actionnable
Public cible : chefs de projet et équipes techniques PME`,
    defaultTone: 'technique',
    defaultLength: 'long'
  },
  {
    id: 'case-study',
    name: 'Étude de cas',
    description: 'Présentation d\'un projet client avec résultats chiffrés',
    prompt: `Rédige une étude de cas professionnelle sur : [SUJET]

Structure attendue :
- Contexte entreprise et enjeux métier
- Problématique initiale (quantifiée si possible)
- Solution mise en œuvre (architecture, technologies, méthodologie)
- Résultats chiffrés (gains de temps, ROI, KPIs)
- Témoignage client (si pertinent)
- Leçons apprises et bonnes pratiques

Ton : factuel, orienté résultats
Public cible : décideurs et directions métier`,
    defaultTone: 'expert',
    defaultLength: 'moyen'
  },
  {
    id: 'news',
    name: 'Actualité IA',
    description: 'Décryptage d\'une actualité ou tendance du secteur',
    prompt: `Rédige un article d'actualité sur : [SUJET]

Structure attendue :
- Accroche : l'actualité en 2 phrases
- Contexte et enjeux
- Impact pour les PME françaises
- Analyse critique (opportunités et limites)
- Recommandations concrètes pour les dirigeants
- Sources et liens utiles

Ton : expert mais accessible
Public cible : dirigeants de PME et responsables innovation`,
    defaultTone: 'expert',
    defaultLength: 'court'
  },
  {
    id: 'guide',
    name: 'Guide méthodologique',
    description: 'Cadre méthodologique pour structurer un projet IA',
    prompt: `Rédige un guide méthodologique complet sur : [SUJET]

Structure attendue :
- Vue d'ensemble de la méthodologie
- Phases du projet avec livrables
- Rôles et responsabilités
- Outils et ressources recommandés
- Critères de succès et KPIs
- Template téléchargeable (si pertinent)

Ton : structuré et opérationnel
Public cible : chefs de projet et consultants`,
    defaultTone: 'expert',
    defaultLength: 'long'
  },
  {
    id: 'comparison',
    name: 'Comparatif solutions',
    description: 'Analyse comparative de technologies ou approches IA',
    prompt: `Rédige un comparatif objectif sur : [SUJET]

Structure attendue :
- Tableau comparatif synthétique (critères clés)
- Description détaillée de chaque solution
- Forces et faiblesses par cas d'usage
- Critères de choix selon le contexte
- Recommandations par profil d'entreprise
- Coûts et investissement requis

Ton : neutre et analytique
Public cible : décideurs en phase de sélection`,
    defaultTone: 'expert',
    defaultLength: 'moyen'
  },
  {
    id: 'glossary',
    name: 'Glossaire / Définition',
    description: 'Explication claire d\'un concept IA complexe',
    prompt: `Rédige un article explicatif sur le concept : [SUJET]

Structure attendue :
- Définition simple en une phrase
- Explication détaillée avec métaphores
- Applications concrètes en entreprise
- Exemples d'usage chez des PME
- Idées reçues à déconstruire
- Pour aller plus loin (ressources)

Ton : pédagogique et accessible
Public cible : néophytes et dirigeants non-techniques`,
    defaultTone: 'vulgarise',
    defaultLength: 'court'
  },
  {
    id: 'opinion',
    name: 'Point de vue expert',
    description: 'Analyse critique d\'une tendance ou débat du secteur',
    prompt: `Rédige un article d'opinion sur : [SUJET]

Structure attendue :
- Positionnement clair dès l'introduction
- Argumentaire structuré (3-4 arguments)
- Contre-arguments et nuances
- Exemples concrets à l'appui
- Vision prospective
- Conclusion avec recommandations

Ton : affirmé mais nuancé
Public cible : professionnels du secteur et décideurs`,
    defaultTone: 'expert',
    defaultLength: 'moyen'
  }
];

const Redacia = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [resourceType, setResourceType] = useState<'article' | 'actualite' | 'cas-client'>('article');
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<'expert' | 'vulgarise' | 'technique'>('expert');
  const [length, setLength] = useState<'court' | 'moyen' | 'long'>('moyen');
  const [generationMode, setGenerationMode] = useState<'claude' | 'gpt' | 'arena'>('arena');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAI, setActiveAI] = useState<'claude' | 'gpt' | null>(null);
  
  const [claudeResult, setClaudeResult] = useState<GeneratedArticle | null>(null);
  const [gptResult, setGptResult] = useState<GeneratedArticle | null>(null);
  
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<GeneratedArticle | null>(null);
  
  const { toast } = useToast();

  const handleTemplateChange = (templateId: string) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    if (templateId !== 'custom') {
      setBrief(template.prompt);
      setTone(template.defaultTone);
      setLength(template.defaultLength);
    } else {
      setBrief('');
    }
  };

  const handleGenerate = async (ai?: 'claude' | 'gpt') => {
    if (!brief.trim()) {
      toast({ title: "Brief requis", description: "Veuillez saisir un sujet", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    const generateWithAI = async (model: 'claude' | 'gpt') => {
      setActiveAI(model);
      const functionName = model === 'claude' ? 'generate-article-claude' : 'generate-article-gpt';
      
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { 
            brief, 
            tone, 
            length,
            templateId: selectedTemplate 
          }
        });

        if (error) throw error;

        if (model === 'claude') {
          setClaudeResult(data);
        } else {
          setGptResult(data);
        }

        return { success: true, model };
      } catch (error) {
        console.error(`Error generating with ${model}:`, error);
        return { success: false, model, error };
      }
    };

    try {
      if (ai) {
        // Génération avec un seul AI spécifique
        const result = await generateWithAI(ai);
        if (result.success) {
          toast({ 
            title: "Généré !", 
            description: `Article généré avec ${ai === 'claude' ? 'Claude' : 'GPT'}` 
          });
        } else {
          throw result.error;
        }
      } else {
        // Mode Arena : générer avec les deux en parallèle
        const [claudeResult, gptResult] = await Promise.all([
          generateWithAI('claude'),
          generateWithAI('gpt')
        ]);

        const successCount = [claudeResult, gptResult].filter(r => r.success).length;
        
        if (successCount === 2) {
          toast({ 
            title: "Mode Arena !", 
            description: "Articles générés avec Claude et GPT" 
          });
        } else if (successCount === 1) {
          const successModel = claudeResult.success ? 'Claude' : 'GPT';
          toast({ 
            title: "Partiellement généré", 
            description: `Article généré avec ${successModel} uniquement`,
            variant: "destructive" 
          });
        } else {
          throw new Error("Échec de génération avec les deux modèles");
        }
      }
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
        published: false,
        resource_type: resourceType
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
    <AdminLayout>
      <Helmet>
        <title>Redacia · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="px-6 py-8">
        
        <section className="bg-background border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Nouveau brief</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Type de ressource
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as 'article' | 'actualite' | 'cas-client')}
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
              >
                <option value="article">Article (fond)</option>
                <option value="actualite">Actualité</option>
                <option value="cas-client">Cas client</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Le contenu généré sera automatiquement associé à ce type de ressource
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Type d'article
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
              >
                {PROMPT_TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} — {template.description}
                  </option>
                ))}
              </select>
              {selectedTemplate !== 'custom' && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Template pré-rempli. Remplacez [SUJET] par votre thématique.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sujet / Idée / Brief *
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Ex: Écrire un article sur l'implémentation CLM pour les directions juridiques. Points clés : phases du projet, facteurs de succès, rôle du Legal Ops..."
                rows={selectedTemplate === 'custom' ? 4 : 8}
                className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none bg-background"
              />
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-sm font-medium mb-2">Mode de génération</label>
                <select
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value as any)}
                  className="w-full border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background"
                >
                  <option value="arena">🏟️ Arena (Claude + GPT)</option>
                  <option value="claude">Claude uniquement</option>
                  <option value="gpt">GPT uniquement</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4">
              {generationMode === 'arena' ? (
                <button
                  onClick={() => handleGenerate()}
                  disabled={!brief.trim() || isGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D97706] to-[#10A37F] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-lg">🏟️</span>
                  )}
                  Mode Arena : Générer avec Claude + GPT
                </button>
              ) : (
                <div className="flex gap-4">
                  {generationMode === 'claude' && (
                    <button
                      onClick={() => handleGenerate('claude')}
                      disabled={!brief.trim() || isGenerating}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#D97706] text-white px-6 py-3 rounded-lg hover:bg-[#B45309] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      Générer avec Claude
                    </button>
                  )}
                  
                  {generationMode === 'gpt' && (
                    <button
                      onClick={() => handleGenerate('gpt')}
                      disabled={!brief.trim() || isGenerating}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#10A37F] text-white px-6 py-3 rounded-lg hover:bg-[#0D8A6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      Générer avec GPT
                    </button>
                  )}
                </div>
              )}
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
        
      </div>
      
      {previewMode && selectedArticle && (
        <PreviewModal 
          article={selectedArticle} 
          onClose={() => setPreviewMode(false)} 
        />
      )}
    </AdminLayout>
  );
};

export default Redacia;
