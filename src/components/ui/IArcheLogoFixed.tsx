import React from 'react';

interface IArcheLogoFixedProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: '3rem',      // 48px
  md: '3.75rem',   // 60px
  lg: '4.5rem',    // 72px
  xl: '6rem',      // 96px
};

export default function IArcheLogoFixed({ size = 'lg', className = '' }: IArcheLogoFixedProps) {
  return (
    <span 
      className={className}
      style={{ 
        fontSize: sizes[size],
        lineHeight: 1.1,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%))',
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
