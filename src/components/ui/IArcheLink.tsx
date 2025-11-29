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
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded
    group
    ${className}
  `;

  const content = (
    <>
      <span>{children}</span>
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
