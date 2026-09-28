import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variants = {
  default: 'bg-[#f0f0f0] text-[#333333] border-[#dbdbdb]',
  success: 'bg-[#e6faee] text-[#14522f] border-[#95eebc]',
  warning: 'bg-[#fbf5f4] text-[#9e3f38] border-[#dfa8a5]',
  danger: 'bg-[#fbf5f4] text-[#80332d] border-[#cf746e]',
  info: 'bg-[#f2fcf7] text-[#12723c] border-[#95eebc]',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      style={{ borderRadius: 0 }}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
