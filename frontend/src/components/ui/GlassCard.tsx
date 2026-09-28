import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

export type CardColorVariant = 'default' | 'blue' | 'orange' | 'red' | 'yellow' | 'green' | 'grey';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  variant?: CardColorVariant;
}

const paddings = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

const variantStyles: Record<CardColorVariant, { background: string; border: string }> = {
  default: {
    background: '#ffffff',
    border: '1px solid var(--color-neutral-200, #dbdbdb)',
  },
  blue: {
    background: '#ffffff',
    border: '1px solid var(--color-primary-300, #95eebc)',
  },
  orange: {
    background: '#ffffff',
    border: '1px solid var(--color-warning, #f59e0b)',
  },
  red: {
    background: '#ffffff',
    border: '1px solid var(--color-error, #b4544a)',
  },
  yellow: {
    background: '#ffffff',
    border: '1px solid var(--color-warning, #f59e0b)',
  },
  green: {
    background: '#ffffff',
    border: '1px solid var(--color-primary-400, #54e894)',
  },
  grey: {
    background: 'var(--color-neutral-50, #f7f7f7)',
    border: '1px solid var(--color-neutral-200, #dbdbdb)',
  },
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ padding = 'md', hover = true, variant = 'default', className, style, children, ...props }, ref) => {
    const vStyle = variantStyles[variant] || variantStyles.default;
    return (
      <div
        ref={ref}
        className={cn('glass-card', paddings[padding], className)}
        style={{
          background: vStyle.background,
          border: vStyle.border,
          borderRadius: '0px',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
