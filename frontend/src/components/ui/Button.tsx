import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-[#1db961] hover:bg-[#168a49] text-white border border-[#168a49] font-medium shadow-xs',
  secondary: 'bg-white hover:bg-[#f7f7f7] text-[#212121] border border-[#dbdbdb] font-medium',
  ghost: 'hover:bg-[#f0f0f0] text-[#333333]',
  glass: 'bg-white hover:bg-[#f7f7f7] border border-[#dbdbdb] text-[#212121]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{ borderRadius: 0 }}
        className={cn(
          'inline-flex items-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1db961] disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
