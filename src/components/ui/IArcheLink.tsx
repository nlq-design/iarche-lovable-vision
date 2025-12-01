import React from 'react';
import { ArrowRight } from 'lucide-react';

interface IArcheLinkProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  href?: string;
  className?: string;
  showArrow?: boolean;
}

/**
 * CTA Secondaire IArche (Option B)
 * Texte en Bleu Nuit + flèche Terracotta animée
 */
const IArcheLink: React.FC<IArcheLinkProps> = ({ 
  children, 
  onClick, 
  href, 
  className = '',
  showArrow = true 
}) => {
  const baseClasses = `
    inline-flex items-center gap-2
    text-sm font-medium
    text-primary
    cursor-pointer
    transition-all duration-300
    hover:gap-3
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded
    group
    ${className}
  `;

  // Underline animé au hover
  const underlineClasses = `
    absolute bottom-0 left-0 w-full h-0.5
    bg-gradient-to-r from-primary via-accent to-primary
    transform scale-x-0 origin-left
    transition-transform duration-300
    group-hover:scale-x-100
  `;

  const content = (
    <>
      <span className="relative">
        {children}
        <span className={underlineClasses} aria-hidden="true" />
      </span>
      {showArrow && (
        <ArrowRight 
          className="w-4 h-4 text-accent transition-transform duration-300 group-hover:translate-x-1" 
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};

export default IArcheLink;
