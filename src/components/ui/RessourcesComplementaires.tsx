import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, BookOpen } from 'lucide-react';

interface Ressource {
  titre: string;
  url: string;
}

interface RessourcesComplementairesProps {
  ressources: Ressource[];
}

export const RessourcesComplementaires = ({ ressources }: RessourcesComplementairesProps) => {
  if (!ressources || ressources.length === 0) {
    return null;
  }

  return (
    <Card className="mt-12 bg-background border border-border">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Ressources complémentaires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {ressources.map((ressource, index) => (
            <li key={index}>
              <a
                href={ressource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-accent transition-colors group"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="underline decoration-primary/30 group-hover:decoration-accent">
                  {ressource.titre}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
