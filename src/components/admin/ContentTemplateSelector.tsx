import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Newspaper, Briefcase, BookOpen, Calendar } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  resourceType: string;
  data: {
    title: string;
    excerpt: string;
    content: string;
  };
}

const templates: Template[] = [
  {
    id: 'article-tutorial',
    name: 'Article Tutoriel',
    description: 'Guide pas-à-pas pour implémenter une solution',
    icon: FileText,
    resourceType: 'article',
    data: {
      title: '[Tutoriel] Comment...',
      excerpt: 'Découvrez étape par étape comment...',
      content: `# Introduction\n\nDans ce tutoriel, nous allons voir comment...\n\n## Prérequis\n\n- Connaissance de base en...\n- Outils nécessaires...\n\n## Étape 1 : Configuration\n\n...\n\n## Étape 2 : Mise en œuvre\n\n...\n\n## Conclusion\n\nVous avez maintenant appris à...`,
    },
  },
  {
    id: 'actualite-annonce',
    name: 'Actualité Annonce',
    description: 'Communication d\'entreprise ou partenariat',
    icon: Newspaper,
    resourceType: 'actualite',
    data: {
      title: 'IArche annonce...',
      excerpt: 'Nous sommes ravis de vous annoncer...',
      content: `Nous sommes heureux de vous annoncer...\n\n## Contexte\n\nDepuis plusieurs mois, nous travaillons sur...\n\n## Les détails\n\nCette nouvelle initiative comprend...\n\n## Impact\n\nCette évolution permettra de...`,
    },
  },
  {
    id: 'cas-client-success',
    name: 'Cas Client',
    description: 'Success story avec résultats mesurables',
    icon: Briefcase,
    resourceType: 'cas-client',
    data: {
      title: '[Nom Client] : Transformation avec l\'IA',
      excerpt: 'Découvrez comment [Client] a transformé ses opérations...',
      content: `## Contexte\n\n**Entreprise :** [Nom]\n**Secteur :** [Secteur]\n**Effectif :** [X collaborateurs]\n\n## Problématique\n\nAvant notre intervention, [Client] faisait face à...\n\n## Solution mise en œuvre\n\nNous avons développé une solution basée sur...\n\n## Résultats\n\n- **+X%** de productivité\n- **-X%** de temps de traitement\n- **X€** d'économies annuelles`,
    },
  },
  {
    id: 'livre-blanc-guide',
    name: 'Livre Blanc',
    description: 'Guide complet sur une thématique',
    icon: BookOpen,
    resourceType: 'livre-blanc',
    data: {
      title: 'Guide complet : [Thématique]',
      excerpt: 'Tout ce que vous devez savoir sur...',
      content: `# Sommaire\n\n1. Introduction\n2. Contexte et enjeux\n3. Les solutions disponibles\n4. Mise en œuvre\n5. Retours d'expérience\n6. Conclusion\n\n## 1. Introduction\n\nCe guide a pour objectif de...\n\n## 2. Contexte et enjeux\n\nDans un contexte où...\n\n## 3. Les solutions disponibles\n\nPlusieurs approches sont possibles...`,
    },
  },
  {
    id: 'atelier-formation',
    name: 'Atelier/Webinaire',
    description: 'Session de formation ou webinaire',
    icon: Calendar,
    resourceType: 'atelier-webinaire',
    data: {
      title: 'Atelier : [Thème]',
      excerpt: 'Session pratique de 2h pour maîtriser...',
      content: `# Objectifs de la session\n\nÀ l'issue de cet atelier, vous serez capable de :\n- Comprendre les concepts clés\n- Mettre en pratique les techniques\n- Éviter les erreurs courantes\n\n## Programme détaillé\n\n**Partie 1** (45min) : Théorie et concepts\n**Partie 2** (45min) : Exercices pratiques\n**Partie 3** (30min) : Q&A et cas d'usage\n\n## Public visé\n\nCet atelier s'adresse aux...`,
    },
  },
];

interface ContentTemplateSelectorProps {
  resourceType: string;
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

export const ContentTemplateSelector = ({ resourceType, onSelectTemplate, onClose }: ContentTemplateSelectorProps) => {
  const filteredTemplates = templates.filter(t => t.resourceType === resourceType);

  if (filteredTemplates.length === 0) {
    return (
      <Card className="mb-6 border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Aucun template disponible</CardTitle>
          <CardDescription>
            Commencez à rédiger votre contenu manuellement
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-2 border-accent/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Démarrer avec un template
        </CardTitle>
        <CardDescription>
          Choisissez un template pour pré-remplir votre article
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-accent hover:shadow-md transition-all"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer les templates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
