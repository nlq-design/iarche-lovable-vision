import React from 'react';

interface IArcheLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: '24px',
  md: '36px',
  lg: '48px',
  xl: '72px',
};

export default function IArcheLogo({ size = 'lg', className = '' }: IArcheLogoProps) {
  return (
    <span 
      className={className}
      style={{ 
        fontSize: sizes[size],
        lineHeight: 1.1,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(90deg, #1A2B4A 0%, #1A2B4A 30%, #D15A3E 70%, #D15A3E 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
      }}
    >
      IArche
    </span>
  );
}
