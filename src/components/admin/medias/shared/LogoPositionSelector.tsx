/**
 * Sélecteur de position du logo pour les éditeurs PNG
 */
import React from 'react';
import { cn } from '@/lib/utils';

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

/**
 * Retourne les styles CSS pour positionner le logo de manière absolue
 */
export const getLogoPositionStyles = (position: LogoPosition): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
  };
  
  switch (position) {
    case 'top-left':
      return { ...base, top: 0, left: 0 };
    case 'top-right':
      return { ...base, top: 0, right: 0 };
    case 'bottom-left':
      return { ...base, bottom: 0, left: 0 };
    case 'bottom-right':
      return { ...base, bottom: 0, right: 0 };
    case 'center':
      return { 
        ...base, 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    default:
      return { ...base, top: 0, left: 0 };
  }
};

interface LogoPositionSelectorProps {
  value: LogoPosition;
  onChange: (position: LogoPosition) => void;
  className?: string;
}

const positions: { value: LogoPosition; label: string; gridArea: string }[] = [
  { value: 'top-left', label: 'Haut gauche', gridArea: '1 / 1' },
  { value: 'top-right', label: 'Haut droite', gridArea: '1 / 3' },
  { value: 'center', label: 'Centré', gridArea: '2 / 2' },
  { value: 'bottom-left', label: 'Bas gauche', gridArea: '3 / 1' },
  { value: 'bottom-right', label: 'Bas droite', gridArea: '3 / 3' },
];

export const LogoPositionSelector: React.FC<LogoPositionSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground">Position du logo</label>
      <div 
        className="grid grid-cols-3 grid-rows-3 gap-1 w-24 h-24 p-1 bg-secondary rounded-lg border border-border"
      >
        {positions.map((pos) => (
          <button
            key={pos.value}
            type="button"
            onClick={() => onChange(pos.value)}
            title={pos.label}
            style={{ gridArea: pos.gridArea }}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all',
              'hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              value === pos.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground border border-border/50'
            )}
          >
            {pos.value === 'center' ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="6" r="3" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                {pos.value === 'top-left' && <path d="M1 1h4v2H3v2H1V1z" />}
                {pos.value === 'top-right' && <path d="M9 1H5v2h2v2h2V1z" />}
                {pos.value === 'bottom-left' && <path d="M1 9h4V7H3V5H1v4z" />}
                {pos.value === 'bottom-right' && <path d="M9 9H5V7h2V5h2v4z" />}
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LogoPositionSelector;
