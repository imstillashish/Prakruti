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

export interface ShaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function ShaderButton({ className, children, ...props }: ShaderButtonProps) {
  const [shaderOn, setShaderOn] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShaderOn(true);
    }
  }, []);

  return (
    <button
      {...props}
      className={cn(
        'relative isolate inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-md px-4',
        'text-sm font-semibold text-white shadow-sm',
        'transition-transform duration-100 active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      {/* Fallback fill — pre-hydration, reduced-motion, and WebGL-failure state */}
      <span aria-hidden className="absolute inset-0 z-0 bg-primary" />
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
                uSpeed={0.3}
                uFrequency={5.5}
                uStrength={3.5}
                uAmplitude={1.0}
                color1="#0a0a0a"
                color2="#171717"
                color3="#262626"
                lightType="3d"
                cDistance={3.6}
                cPolarAngle={90}
                cAzimuthAngle={135}
                shader="defaults"
                reflection={0.15}
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
