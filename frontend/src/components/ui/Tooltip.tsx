'use client';
import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2',
            'bg-[#212121] text-white border border-[#333333]',
            'px-2.5 py-1 text-xs font-mono shadow-md',
            'min-w-max max-w-xs animate-in fade-in-0 duration-100',
            className
          )}
          style={{ borderRadius: 0 }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
