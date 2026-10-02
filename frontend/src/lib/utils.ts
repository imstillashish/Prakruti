import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function interpolate(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
