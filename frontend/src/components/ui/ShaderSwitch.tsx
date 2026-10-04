'use client';

import { Suspense, useEffect, useRef, useState, forwardRef } from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { cn } from '@/lib/utils';
import { COLORWAY_DEEP, SHADER_FILL } from '@/lib/palette';
import type { ShaderVariant } from '@/components/ui/ShaderButton';

export interface ShaderSwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: 'sm' | 'md';
  variant?: ShaderVariant;
}

const VARIANTS: Record<
  ShaderVariant,
  {
    ring: string;
    fill: readonly string[];
  }
> = {
  ocean: {
    ring: 'focus-visible:ring-action',
    fill: SHADER_FILL.ocean,
  },
  emerald: {
    ring: 'focus-visible:ring-success',
    fill: SHADER_FILL.emerald,
  },
  amber: {
    ring: 'focus-visible:ring-warning',
    fill: SHADER_FILL.amber,
  },
  destructive: {
    ring: 'focus-visible:ring-destructive',
    fill: SHADER_FILL.destructive,
  },
  neutral: {
    ring: 'focus-visible:ring-foreground',
    fill: SHADER_FILL.neutral,
  },
  rain: {
    ring: 'focus-visible:ring-[#0e7490]',
    fill: SHADER_FILL.rain,
  },
};

export const ShaderSwitch = forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  ShaderSwitchProps
>(({ className, size = 'md', variant = 'ocean', checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const isChecked = checked !== undefined ? checked : internalChecked;

  const [shaderOn, setShaderOn] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const rootRef = useRef<HTMLButtonElement | null>(null);

  const v = VARIANTS[variant] || VARIANTS.ocean;

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShaderOn(true);
    }
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCheckedChange = (state: boolean) => {
    if (checked === undefined) {
      setInternalChecked(state);
    }
    onCheckedChange?.(state);
  };

  return (
    <SwitchPrimitives.Root
      {...props}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      disabled={disabled}
      checked={isChecked}
      onCheckedChange={handleCheckedChange}
      className={cn(
        'relative isolate inline-flex shrink-0 cursor-pointer items-center rounded-full border border-border/80 transition-colors overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        v.ring,
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-7 w-12' : 'h-5 w-9',
        className
      )}
    >
      {/* Fallback & Off-state background */}
      <span
        aria-hidden
        className="absolute inset-0 z-0 transition-colors duration-200"
        style={{
          backgroundColor: isChecked ? COLORWAY_DEEP[variant] : '#dcdee0',
        }}
      />

      {/* 3D WebGL ShaderGradient when active & visible */}
      {isChecked && shaderOn && onScreen && (
        <span aria-hidden className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Suspense fallback={null}>
            <ShaderGradientCanvas
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              pixelDensity={0.5}
              fov={45}
            >
              <ShaderGradient
                type="plane"
                animate="on"
                uSpeed={0.45}
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

      {/* Sliding Thumb */}
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 relative z-10',
          size === 'md'
            ? 'h-5 w-5 data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]'
            : 'h-3.5 w-3.5 data-[state=checked]:translate-x-[17px] data-[state=unchecked]:translate-x-[2px]'
        )}
      />
    </SwitchPrimitives.Root>
  );
});

ShaderSwitch.displayName = 'ShaderSwitch';
