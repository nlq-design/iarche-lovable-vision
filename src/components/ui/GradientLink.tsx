import React from 'react';

interface GradientLinkProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * CTA Primaire avec gradient animé IArche (Option A)
 * Utilise le gradient 270deg Bleu Nuit ↔ Terracotta avec soulignement animé
 */
const GradientLink: React.FC<GradientLinkProps> = ({ 
  children, 
  onClick, 
  href, 
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


  // Séparer texte et icône si les enfants sont multiples
  const childrenArray = React.Children.toArray(children);
  const hasMultipleChildren = childrenArray.length > 1;

  const content = hasMultipleChildren ? (
    <>
      <span className={gradientTextClasses}>{childrenArray[0]}</span>
      {childrenArray.slice(1)}
    </>
  ) : (
    <span className={gradientTextClasses}>{children}</span>
  );

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
