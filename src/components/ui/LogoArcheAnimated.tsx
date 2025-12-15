import Logo from './Logo';

interface LogoArcheAnimatedProps {
  className?: string;
}

/**
 * Logo IArche animé - Version v4.0
 * 
 * Logo statique UNIQUEMENT, sans arc décoratif
 * L'arc ne doit JAMAIS être sous le logo
 * L'arc est réservé aux titres et éléments d'identité site
 */
const LogoArcheAnimated = ({ className = '' }: LogoArcheAnimatedProps) => {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Logo IArche officiel - SANS arc */}
      <div className="invisible animate-fadeIn [animation-delay:0.1s]">
        <Logo variant="main" size="lg" />
      </div>
    </div>
  );
};

export default LogoArcheAnimated;
