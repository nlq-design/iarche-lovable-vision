import Logo from './Logo';
import LogoArc from './LogoArc';

interface LogoArcheAnimatedProps {
  className?: string;
}

/**
 * Logo IArche avec arc décoratif - Version v4.0
 * 
 * Logo statique avec arc, sans animations complexes
 * Remplace l'ancienne version avec lignes canalisation
 */
const LogoArcheAnimated = ({ className = '' }: LogoArcheAnimatedProps) => {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Logo IArche officiel */}
      <div className="invisible animate-fadeIn [animation-delay:0.1s]">
        <Logo variant="main" size="lg" />
      </div>
      
      {/* Arc décoratif */}
      <LogoArc 
        size="md" 
        className="mt-3 invisible animate-fadeIn [animation-delay:0.2s]"
      />
    </div>
  );
};

export default LogoArcheAnimated;
