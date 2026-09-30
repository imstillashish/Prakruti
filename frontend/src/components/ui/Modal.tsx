'use client';
import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handler);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'w-full bg-white border border-border shadow-xl',
          sizes[size],
          'max-h-[85vh] overflow-y-auto',
          className
        )}
        style={{
          borderRadius: 0,
          animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <h2 className="text-xs font-mono font-bold tracking-widest text-foreground uppercase">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-secondary border border-transparent hover:border-border transition-colors text-muted-foreground hover:text-foreground"
             
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
