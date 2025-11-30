import { memo, ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  href?: string;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const GradientButton = memo(
  forwardRef<HTMLButtonElement, GradientButtonProps>(
    ({ children, href, variant = 'primary', size = 'md', className = '', ...props }, ref) => {
      const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      };

      const baseClasses = cn(
        'inline-flex items-center justify-center gap-2',
        'font-medium rounded-lg',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size]
      );

      const primaryClasses =
        'text-white bg-gradient-to-r from-primary to-accent bg-[length:200%_100%] bg-left hover:bg-right shadow-md hover:shadow-lg';

      const outlineClasses =
        'bg-transparent border-2 border-primary text-primary hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white hover:border-transparent';

      const variantClasses = variant === 'primary' ? primaryClasses : outlineClasses;

      const combinedClasses = cn(baseClasses, variantClasses, className);

      if (href) {
        return (
          <Link to={href} className={combinedClasses}>
            {children}
          </Link>
        );
      }

      return (
        <button ref={ref} className={combinedClasses} {...props}>
          {children}
        </button>
      );
    }
  )
);

GradientButton.displayName = 'GradientButton';

export default GradientButton;
