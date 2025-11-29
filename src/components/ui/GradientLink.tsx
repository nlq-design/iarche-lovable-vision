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
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

  const gradientTextClasses = 'hero-gradient-text';

  const underlineClasses = `
    absolute bottom-0 left-0 right-0 h-0.5
    bg-gradient-to-r from-primary via-accent to-primary
    bg-[length:200%_100%]
    scale-x-0 group-hover:scale-x-100
    transition-transform duration-300 ease-out
    origin-left
  `;

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} group`}
        onClick={onClick}
      >
        <span className={gradientTextClasses}>{children}</span>
        <span className={underlineClasses} aria-hidden="true" />
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
      <span className={gradientTextClasses}>{children}</span>
      <span className={underlineClasses} aria-hidden="true" />
    </button>
  );
};

export default GradientLink;
