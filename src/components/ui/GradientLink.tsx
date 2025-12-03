import React from 'react';
import { Link } from 'react-router-dom';

interface GradientLinkProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  to?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * CTA Primaire avec gradient animé IArche (Option A)
 * Utilise le gradient 270deg Bleu Nuit ↔ Terracotta avec soulignement animé
 * Supporte href (liens externes) et to (navigation interne React Router)
 */
const GradientLink: React.FC<GradientLinkProps> = ({ 
  children, 
  onClick, 
  href,
  to,
  className = '',
  type = 'button',
  disabled = false 
}) => {
  const baseClasses = `
    inline-flex items-center gap-2
    text-base font-medium
    relative
    cursor-pointer
    transition-all duration-300
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

  const gradientTextClasses = 'hero-gradient-text';

  // Underline animé au hover uniquement
  const underlineClasses = `
    absolute bottom-0 left-0 w-full h-0.5
    bg-gradient-to-r from-primary via-accent to-primary
    transform scale-x-0 origin-left
    transition-transform duration-300
    group-hover:scale-x-100
  `;

  // Séparer texte et icône si les enfants sont multiples
  const childrenArray = React.Children.toArray(children);
  const hasMultipleChildren = childrenArray.length > 1;

  const content = hasMultipleChildren ? (
    <>
      <span className={`${gradientTextClasses} relative`}>
        {childrenArray[0]}
        <span className={underlineClasses} aria-hidden="true" />
      </span>
      {childrenArray.slice(1)}
    </>
  ) : (
    <span className={`${gradientTextClasses} relative`}>
      {children}
      <span className={underlineClasses} aria-hidden="true" />
    </span>
  );

  // Navigation interne React Router
  if (to) {
    return (
      <Link
        to={to}
        className={`${baseClasses} group`}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  // Lien externe
  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} group`}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} group`}
      disabled={disabled}
    >
      {content}
    </button>
  );
};

export default GradientLink;