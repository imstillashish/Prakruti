'use client';
/**
 * Creative button (ui-layouts style) whose fill is a live animated mesh
 * gradient via @shadergradient/react, tinted to Prakruti's blue family —
 * link blue #0d74ce, water #1e6fb8, sky-light #cfe7ff. Static site blue
 * renders on the server and under prefers-reduced-motion; the shader canvas
 * mounts only after hydration.
 */
import { Suspense, useEffect, useState } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { cn } from '@/lib/utils';

export type ShaderVariant = 'ocean' | 'emerald' | 'amber' | 'indigo' | 'ink';

export interface ShaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: ShaderVariant;
}

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const VARIANTS: Record<
  ShaderVariant,
  {
    fallbackBg: string;
    shadow: string;
    focusOutline: string;
    color1: string;
    color2: string;
    color3: string;
  }
> = {
  ocean: {
    fallbackBg: 'bg-[#0d74ce]',
    shadow: 'shadow-[0_4px_12px_rgba(13,116,206,0.25)]',
    focusOutline: 'focus-visible:outline-[#0d74ce]',
    color1: '#0d74ce',
    color2: '#1e6fb8',
    color3: '#cfe7ff',
  },
  indigo: {
    fallbackBg: 'bg-[#4f46e5]',
    shadow: 'shadow-[0_4px_12px_rgba(79,70,229,0.25)]',
    focusOutline: 'focus-visible:outline-[#4f46e5]',
    color1: '#4f46e5',
    color2: '#6366f1',
    color3: '#c7d2fe',
  },
  emerald: {
    fallbackBg: 'bg-[#16a34a]',
    shadow: 'shadow-[0_4px_12px_rgba(22,163,74,0.25)]',
    focusOutline: 'focus-visible:outline-[#16a34a]',
    color1: '#16a34a',
    color2: '#059669',
    color3: '#bbf7d0',
  },
  amber: {
    fallbackBg: 'bg-[#ab6400]',
    shadow: 'shadow-[0_4px_12px_rgba(171,100,0,0.25)]',
    focusOutline: 'focus-visible:outline-[#ab6400]',
    color1: '#ab6400',
    color2: '#d97706',
    color3: '#fde68a',
  },
  ink: {
    fallbackBg: 'bg-[#171717]',
    shadow: 'shadow-[0_4px_12px_rgba(23,23,23,0.25)]',
    focusOutline: 'focus-visible:outline-[#171717]',
    color1: '#171717',
    color2: '#33373e',
    color3: '#9ca3af',
  },
};

export function ShaderButton({
  className,
  children,
  size = 'md',
  variant = 'ocean',
  ...props
}: ShaderButtonProps) {
  const [shaderOn, setShaderOn] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.ocean;

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShaderOn(true);
    }
  }, []);

  return (
    <button
      {...props}
      className={cn(
        'relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-md font-semibold text-white',
        v.shadow,
        'transition-transform duration-100 active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        v.focusOutline,
        'disabled:pointer-events-none disabled:opacity-50',
        SIZES[size],
        className
      )}
    >
      {/* Fallback fill — pre-hydration, reduced-motion, and WebGL-failure state */}
      <span aria-hidden className={cn('absolute inset-0 z-0', v.fallbackBg)} />
      {shaderOn && (
        <span aria-hidden className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <ShaderGradientCanvas
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              pixelDensity={0.5}
              fov={45}
            >
              <ShaderGradient
                type="plane"
                animate="on"
                uSpeed={0.4}
                uFrequency={5.5}
                uStrength={4}
                uAmplitude={1.2}
                color1={v.color1}
                color2={v.color2}
                color3={v.color3}
                lightType="3d"
                cDistance={3.6}
                cPolarAngle={90}
                cAzimuthAngle={135}
                shader="defaults"
                reflection={0.2}
                grain="off"
              />
            </ShaderGradientCanvas>
          </Suspense>
        </span>
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
