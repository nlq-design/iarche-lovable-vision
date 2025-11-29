import React from 'react';
import { Linkedin, Globe, Share2 } from 'lucide-react';

interface AuthorCardProps {
  photo?: string;
  nom?: string;
  fonction?: string;
  linkedin?: string;
  site?: string;
}

const AuthorCard = ({
  photo = '/images/nicolas-lara.jpg',
  nom = 'Nicolas LARA',
  fonction = 'CEO & Fondateur IArche',
  linkedin = 'https://www.linkedin.com/in/nicolas-lara-queralta/',
  site = 'https://iarche.fr'
}: AuthorCardProps) => {
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href
        });
      } catch (err) {
        console.log('Partage annulé');
      }
    }
  };

  return (
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
      <div className="text-[11px] uppercase text-[#6B7280] tracking-wider mb-3 font-semibold">
        Auteur
      </div>

      {/* Photo */}
      <div className="flex justify-center mb-3">
        <div className="relative p-[2px] rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-lg">
          <img 
            src={photo} 
            alt={nom}
            className="w-16 h-16 rounded-full object-cover bg-background"
          />
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
    </aside>
  );
};

export default AuthorCard;
