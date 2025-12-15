import { memo } from 'react';
import Logo from './Logo';
import LogoArc from './LogoArc';

interface ArticlePlaceholderProps {
  className?: string;
  size?: 'default' | 'large';
}

/**
 * Placeholder pour les cards d'articles - Version v4.0
 * 
 * Logo IArche statique avec arc décoratif
 * Sans animations, sans canalisations
 */
const ArticlePlaceholder = memo(({ className = '', size = 'default' }: ArticlePlaceholderProps) => {
  return (
    <div className={`relative overflow-hidden bg-background flex flex-col items-center justify-center ${className}`}>
      {/* Logo IArche officiel statique */}
      <Logo 
        variant="main" 
        size={size === 'large' ? 'lg' : 'md'} 
      />
      
      {/* Arc décoratif sous le logo */}
      <LogoArc 
        size={size === 'large' ? 'md' : 'sm'} 
        className="mt-3"
      />
    </div>
  );
});

ArticlePlaceholder.displayName = 'ArticlePlaceholder';

export default ArticlePlaceholder;
