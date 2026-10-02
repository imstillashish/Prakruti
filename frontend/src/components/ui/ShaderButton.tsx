'use client';
/**
 * Creative button (ui-layouts style) whose fill is a live animated mesh
 * gradient via @shadergradient/react. Variants follow DESIGN.md v4 §12:
 * ocean acts, amber dispatches, emerald verifies. The static fill renders on
 * the server and under prefers-reduced-motion; the shader canvas mounts only
 * after hydration. The canvas lives only while the button is near the viewport,
 * so a page full of dispatch buttons never holds more than a context or two.
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { cn } from '@/lib/utils';
import { COLORWAY_DEEP, SHADER_FILL } from '@/lib/palette';

export type ShaderVariant = 'ocean' | 'emerald' | 'amber';

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
    shadow: string;
    focusOutline: string;
    fill: readonly string[];
  }
> = {
  ocean: {
    shadow: 'shadow-[0_4px_12px_rgba(13,116,206,0.25)]',
    focusOutline: 'focus-visible:outline-action',
    fill: SHADER_FILL.ocean,
  },
  emerald: {
    shadow: 'shadow-[0_4px_12px_rgba(4,120,87,0.25)]',
    focusOutline: 'focus-visible:outline-success',
    fill: SHADER_FILL.emerald,
  },
  amber: {
    shadow: 'shadow-[0_4px_12px_rgba(180,83,9,0.25)]',
    focusOutline: 'focus-visible:outline-warning',
    fill: SHADER_FILL.amber,
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
  const [onScreen, setOnScreen] = useState(false);
  const root = useRef<HTMLButtonElement>(null);
  const v = VARIANTS[variant] || VARIANTS.ocean;

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShaderOn(true);
    }
  }, []);

  // Per-button rather than shared: there are a handful of these on a page at
  // most (the WebGL tier), unlike the dozens of CSS mesh controls that share
  // MeshVisibility's observer. The margin mounts the canvas slightly before it
  // is reachable, so scrolling back up never catches it still building.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      {...props}
      ref={root}
      data-gradient-tier="focal"
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
      <span
        aria-hidden
        className="absolute inset-0 z-0"
        style={{ backgroundColor: COLORWAY_DEEP[variant] }}
      />
      {shaderOn && onScreen && (
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
                color1={v.fill[0]}
                color2={v.fill[1]}
                color3={v.fill[2]}
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
