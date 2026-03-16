import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NavLink } from '@/components/NavLink';
import { Calendar } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';
import GradientTitle from '@/components/ui/GradientTitle';
import LogoArc from '@/components/ui/LogoArc';

interface ResourceCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  createdAt?: string;
  /** Route de base (ex: '/solutions', '/articles') */
  basePath: string;
  /** Index pour l'animation delay */
  index?: number;
  /** Afficher la date */
  showDate?: boolean;
  /** Afficher l'arc décoratif */
  showArc?: boolean;
  /** Taille de l'arc */
  arcSize?: 'sm' | 'md';
  /** Contenu additionnel en bas de carte */
  footer?: ReactNode;
  /** Callback au clic */
  onClick?: () => void;
}

/**
 * Carte ressource unifiée pour toutes les pages de listing
 * Conforme à la charte graphique v4.0 avec LogoArc
 */
const ResourceCard = ({
  id,
  title,
  slug,
  excerpt,
  coverImageUrl,
  createdAt,
  basePath,
  index = 0,
  showDate = true,
  showArc = false, // v4.0: Arc disabled by default in cards
  arcSize = 'sm',
  footer,
  onClick,
}: ResourceCardProps) => {
  return (
    <NavLink
      to={`${basePath}/${slug}`}
      className="group"
      onClick={onClick}
    >
      <Card 
        className="h-full hover:shadow-md transition-all duration-300 bg-background border border-border/60 rounded-lg overflow-hidden animate-fadeIn"
        style={{ animationDelay: `${0.2 + index * 0.08}s` }}
      >
        {/* Image de couverture */}
        {coverImageUrl ? (
          <div className="h-36 overflow-hidden">
            <img
              src={coverImageUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <ArticlePlaceholder className="h-36" />
        )}

        <CardHeader className="pb-2 pt-4">
          <GradientTitle 
            size="sm" 
            as="h2" 
            centered={false} 
            textClassName="line-clamp-2 text-base"
            showArc={false}
          >
            {title}
          </GradientTitle>
          
          {/* Arc décoratif sous le titre */}
          {showArc && (
            <div className="mt-2">
              <LogoArc size={arcSize} />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {excerpt}
            </p>
          )}
          
          {/* Date discrète */}
          {showDate && createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 pt-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <time dateTime={new Date(createdAt).toISOString()}>
                {new Date(createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </time>
            </div>
          )}
          
          {/* Contenu additionnel optionnel */}
          {footer}
        </CardContent>
      </Card>
    </NavLink>
  );
};

export default ResourceCard;
