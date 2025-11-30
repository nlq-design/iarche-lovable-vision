import React from 'react';
import { Linkedin, Globe, Share2 } from 'lucide-react';
import GradientLink from './GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthorCardProps {
  photo?: string;
  nom?: string;
  fonction?: string;
  linkedin?: string;
  site?: string;
  showAuthorLabel?: boolean;
}

const AuthorCard = ({
  photo = '/images/nicolas-lara.jpg',
  nom = 'Nicolas',
  fonction = 'Fondateur IArche',
  linkedin = 'https://www.linkedin.com/in/nicolas-lara-queralta/',
  site = 'https://iarche.fr',
  showAuthorLabel = true
}: AuthorCardProps) => {
  const { trackCTAClick } = useCTATracking();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleShare = async () => {
    const currentUrl = window.location.href;
    const currentSlug = window.location.pathname.split('/').pop() || 'unknown';
    
    // Track CTA click
    trackCTAClick('partager_article', 'author_card', currentSlug);
    
    // Try Web Share API (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: currentUrl
        });
        toast({
          title: "Partagé avec succès",
          description: "Merci de partager ce contenu !",
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Erreur partage:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard (desktop)
      try {
        await navigator.clipboard.writeText(currentUrl);
        toast({
          title: "Lien copié !",
          description: "L'URL a été copiée dans le presse-papier.",
        });
      } catch (err) {
        toast({
          title: "Erreur",
          description: "Impossible de copier le lien.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      {/* Version Mobile - Horizontal Compact */}
      <aside className="
        author-card
        md:hidden
        block
        bg-[#F8F9FA]
        border
        border-[#E5E7EB]
        rounded-xl
        p-4
        mb-6
        animate-fadeIn
        [animation-delay:0.3s]
      ">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative p-[2px] rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-lg flex-shrink-0">
            <picture>
              <source srcSet="/images/nicolas-lara.webp" type="image/webp" />
              <img 
                src={photo} 
                alt={nom}
                loading="lazy"
                className="w-14 h-14 rounded-full object-cover bg-background"
              />
            </picture>
          </div>

          {/* Info centrale */}
          <div className="flex-1 min-w-0">
            {showAuthorLabel && (
              <div className="text-xs uppercase text-[#6B7280] tracking-wider mb-1 font-semibold">
                Auteur
              </div>
            )}
            <div className={`text-sm font-semibold text-[#111827] mb-0.5 truncate ${!showAuthorLabel ? 'mt-1' : ''}`}>
              {nom}
            </div>
            <div className="text-xs text-[#6B7280] truncate">
              {fonction}
            </div>
          </div>

          {/* Icônes réseaux */}
          <div className="flex gap-2 flex-shrink-0">
            {linkedin && (
              <a 
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {site && (
              <a 
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
                aria-label="Site web"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handleShare}
              className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
              aria-label="Partager"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTA En savoir plus - Mobile */}
        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
          <GradientLink 
            onClick={() => {
              trackCTAClick('en_savoir_plus', 'author_card_mobile', window.location.pathname);
              navigate('/contact?source=author_card&context=' + encodeURIComponent(window.location.pathname));
            }}
            className="text-sm"
          >
            En savoir plus
          </GradientLink>
        </div>
      </aside>

      {/* Version Desktop - Vertical Sticky */}
      <aside className="
        author-card
        float-left
        w-[200px]
        bg-[#F8F9FA]
        border
        border-[#E5E7EB]
        rounded-xl
        p-5
        mr-8
        mb-6
        sticky
        top-28
        animate-fadeIn
        [animation-delay:0.3s]
        md:block
        hidden
      ">
        {/* Label "Auteur" */}
        {showAuthorLabel && (
          <div className="text-[11px] uppercase text-[#6B7280] tracking-wider mb-3 font-semibold">
            Auteur
          </div>
        )}

        {/* Photo */}
        <div className="flex justify-center mb-3">
          <div className="relative p-[2px] rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-lg">
            <picture>
              <source srcSet="/images/nicolas-lara.webp" type="image/webp" />
              <img 
                src={photo} 
                alt={nom}
                loading="lazy"
                className="w-16 h-16 rounded-full object-cover bg-background"
              />
            </picture>
          </div>
        </div>

        {/* Nom */}
        <div className="text-base font-semibold text-[#111827] text-center mb-1">
          {nom}
        </div>

        {/* Fonction */}
        <div className="text-[13px] text-[#6B7280] text-center mb-4">
          {fonction}
        </div>

        {/* Icônes réseaux */}
        <div className="flex justify-center gap-3 mb-4">
          {linkedin && (
            <a 
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {site && (
            <a 
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
              aria-label="Site web"
            >
              <Globe className="w-5 h-5" />
            </a>
          )}
        </div>

        {/* Séparateur */}
        <div className="h-px bg-[#E5E7EB] my-3" />

        {/* Partager */}
        <button
          onClick={handleShare}
          className="w-full text-[13px] text-[#374151] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2 py-1"
        >
          <Share2 className="w-4 h-4" />
          Partager
        </button>

        {/* CTA En savoir plus - Desktop */}
        <div className="mt-4 pt-4 border-t border-[#E5E7EB] text-center">
          <GradientLink 
            onClick={() => {
              trackCTAClick('en_savoir_plus', 'author_card', window.location.pathname);
              navigate('/contact?source=author_card&context=' + encodeURIComponent(window.location.pathname));
            }}
            className="text-sm"
          >
            En savoir plus
          </GradientLink>
        </div>
      </aside>
    </>
  );
};

export default AuthorCard;
