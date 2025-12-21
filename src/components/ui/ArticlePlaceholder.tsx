import { memo } from 'react';
import Logo from './Logo';

interface ArticlePlaceholderProps {
  className?: string;
  size?: 'default' | 'large';
}

/**
 * Placeholder pour les cards d'articles - Version v4.0
 * 
 * Logo IArche statique UNIQUEMENT
 * L'arc ne doit JAMAIS être sous le logo dans les cards
 * L'arc est réservé aux titres et éléments d'identité site
 */
const ArticlePlaceholder = memo(({ className = '', size = 'default' }: ArticlePlaceholderProps) => {
  return (
    <div 
      className={`relative overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' }}
    >
      {/* Logo IArche blanc sur fond gradient - SANS arc */}
      <Logo 
        variant="white" 
        size={size === 'large' ? 'lg' : 'md'} 
      />
    </div>
  );
});

ArticlePlaceholder.displayName = 'ArticlePlaceholder';

export default ArticlePlaceholder;
