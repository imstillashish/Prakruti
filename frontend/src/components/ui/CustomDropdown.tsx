'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomDropdownProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors duration-150 text-left',
          'bg-white hover:bg-[#f7f7f7] border border-[#dbdbdb] shadow-xs',
          'focus:outline-none focus:border-[#1db961]',
          isOpen && 'border-[#1db961]'
        )}
        style={{ borderRadius: 0 }}
      >
        <span className={cn('truncate font-medium', value ? 'text-[#212121]' : 'text-[#808080]')}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn('text-[#808080] transition-transform duration-200 shrink-0 ml-2', isOpen && 'rotate-180 text-[#1db961]')}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto py-1',
            'bg-white border border-[#dbdbdb] shadow-md',
            'animate-in fade-in-0 duration-100'
          )}
          style={{
            borderRadius: 0,
          }}
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-slate-400">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors text-left',
                    isSelected
                      ? 'bg-blue-500/10 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
