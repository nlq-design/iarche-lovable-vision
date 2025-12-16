/**
 * Bibliothèque de phrases d'accroche v4.1
 * Catégories : Autorité, Curiosité, Urgence, Preuve sociale, Question
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface Catchphrase {
  id: string;
  text: string;
  category: CatchphraseCategory;
  context?: string;
}

export type CatchphraseCategory = 'autorite' | 'curiosite' | 'urgence' | 'preuve' | 'question' | 'cta';

const CATEGORY_LABELS: Record<CatchphraseCategory, { label: string; color: string }> = {
  autorite: { label: 'Autorité', color: 'bg-blue-100 text-blue-800' },
  curiosite: { label: 'Curiosité', color: 'bg-purple-100 text-purple-800' },
  urgence: { label: 'Urgence', color: 'bg-red-100 text-red-800' },
  preuve: { label: 'Preuve sociale', color: 'bg-green-100 text-green-800' },
  question: { label: 'Question', color: 'bg-amber-100 text-amber-800' },
  cta: { label: 'CTA', color: 'bg-orange-100 text-orange-800' },
};

export const CATCHPHRASES: Catchphrase[] = [
  // Autorité
  { id: 'a1', text: "L'IA se construit avec vous", category: 'autorite', context: 'Baseline IArche' },
  { id: 'a2', text: 'Expert IA pour PME depuis 2020', category: 'autorite' },
  { id: 'a3', text: 'Plus de 50 entreprises accompagnées', category: 'autorite' },
  { id: 'a4', text: 'Méthodologie éprouvée, résultats mesurables', category: 'autorite' },
  { id: 'a5', text: 'Votre partenaire IA de confiance', category: 'autorite' },
  { id: 'a6', text: "L'expertise IA au service de votre croissance", category: 'autorite' },
  
  // Curiosité
  { id: 'c1', text: "Et si l'IA devenait votre meilleur allié ?", category: 'curiosite' },
  { id: 'c2', text: 'Découvrez ce que l\'IA peut faire pour vous', category: 'curiosite' },
  { id: 'c3', text: "L'IA n'est pas ce que vous croyez...", category: 'curiosite' },
  { id: 'c4', text: '3 secrets pour réussir votre transformation IA', category: 'curiosite' },
  { id: 'c5', text: 'Ce que 87% des dirigeants ignorent sur l\'IA', category: 'curiosite' },
  { id: 'c6', text: 'La vraie question n\'est pas "si", mais "quand"', category: 'curiosite' },
  
  // Urgence
  { id: 'u1', text: 'Ne laissez pas vos concurrents prendre de l\'avance', category: 'urgence' },
  { id: 'u2', text: 'Offre limitée : audit IA gratuit', category: 'urgence' },
  { id: 'u3', text: '2024 est l\'année de l\'IA. Et vous ?', category: 'urgence' },
  { id: 'u4', text: 'Chaque jour sans IA est une opportunité manquée', category: 'urgence' },
  { id: 'u5', text: 'Places limitées - Inscrivez-vous maintenant', category: 'urgence' },
  { id: 'u6', text: 'Le moment d\'agir, c\'est maintenant', category: 'urgence' },
  
  // Preuve sociale
  { id: 'p1', text: '92% de nos clients recommandent IArche', category: 'preuve' },
  { id: 'p2', text: '+200% de productivité en moyenne', category: 'preuve' },
  { id: 'p3', text: 'Ils nous font confiance depuis 2020', category: 'preuve' },
  { id: 'p4', text: 'ROI positif dès les 6 premiers mois', category: 'preuve' },
  { id: 'p5', text: 'Témoignage client : "Une transformation réussie"', category: 'preuve' },
  { id: 'p6', text: 'Note moyenne : 4.9/5 sur nos accompagnements', category: 'preuve' },
  
  // Questions
  { id: 'q1', text: 'Êtes-vous prêt pour l\'IA ?', category: 'question' },
  { id: 'q2', text: 'Combien de temps perdez-vous sur des tâches répétitives ?', category: 'question' },
  { id: 'q3', text: 'Et si vous automatisiez 40% de votre admin ?', category: 'question' },
  { id: 'q4', text: 'Votre entreprise est-elle prête pour demain ?', category: 'question' },
  { id: 'q5', text: 'Comment l\'IA peut-elle vous aider concrètement ?', category: 'question' },
  { id: 'q6', text: 'Quel est le vrai coût de l\'inaction ?', category: 'question' },
  
  // CTA
  { id: 'cta1', text: 'En savoir plus →', category: 'cta' },
  { id: 'cta2', text: 'Découvrir nos solutions', category: 'cta' },
  { id: 'cta3', text: 'Prendre rendez-vous', category: 'cta' },
  { id: 'cta4', text: 'Télécharger le guide gratuit', category: 'cta' },
  { id: 'cta5', text: "S'inscrire maintenant", category: 'cta' },
  { id: 'cta6', text: 'Demander un audit gratuit', category: 'cta' },
  { id: 'cta7', text: 'Voir le cas client', category: 'cta' },
  { id: 'cta8', text: 'Réserver ma place', category: 'cta' },
];

interface CatchphraseLibraryProps {
  onSelect: (phrase: string) => void;
  compact?: boolean;
}

export default function CatchphraseLibrary({ onSelect, compact = false }: CatchphraseLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<CatchphraseCategory | 'all'>('all');

  const filteredPhrases = activeCategory === 'all' 
    ? CATCHPHRASES 
    : CATCHPHRASES.filter(p => p.category === activeCategory);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Phrase copiée !');
  };

  const handleSelect = (text: string) => {
    onSelect(text);
    toast.success('Phrase appliquée !');
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Phrases d'accroche
        </Label>
        <ScrollArea className="h-[200px] rounded-md border p-2">
          <div className="space-y-1">
            {CATCHPHRASES.slice(0, 15).map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => handleSelect(phrase.text)}
                className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
              >
                {phrase.text}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Bibliothèque d'accroches
        </Label>
        <Badge variant="secondary">{filteredPhrases.length} phrases</Badge>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CatchphraseCategory | 'all')}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="all" className="text-xs">Toutes</TabsTrigger>
          {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 space-y-2">
              {filteredPhrases.map((phrase) => (
                <div
                  key={phrase.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{phrase.text}</p>
                    {phrase.context && (
                      <p className="text-xs text-muted-foreground mt-1">{phrase.context}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className={CATEGORY_LABELS[phrase.category].color} variant="secondary">
                      {CATEGORY_LABELS[phrase.category].label}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleCopy(phrase.text)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSelect(phrase.text)}
                    >
                      Utiliser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper pour obtenir une phrase aléatoire par catégorie
export function getRandomCatchphrase(category?: CatchphraseCategory): string {
  const phrases = category 
    ? CATCHPHRASES.filter(p => p.category === category)
    : CATCHPHRASES;
  return phrases[Math.floor(Math.random() * phrases.length)].text;
}