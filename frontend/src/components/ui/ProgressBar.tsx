import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  animated?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, max = 100, color = '#1db961', height = 6, animated = true, className, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-1 text-xs font-mono">
          <span className="text-[#575757]">{label}</span>
          <span className="font-semibold text-[#212121]">{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="w-full overflow-hidden border border-[#dbdbdb]"
        style={{ height, background: '#f0f0f0', borderRadius: 0 }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: color,
            borderRadius: 0,
            transition: animated ? 'width 0.8s cubic-bezier(0.16,1,0.3,1)' : undefined,
          }}
        />
      </div>
    </div>
  );
}
