'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MorMark } from '@/components/brand/MorMark';
import { AvatarStack, type AvatarItem } from '@/components/spectrumui/avatar-stack';

const GITHUB_REPO = 'imstillashish/Prakruti';

/**
 * Live GitHub contributors. SSR and error states show the repo owner's
 * avatar (github.com/<user>.png is a CDN redirect, no API rate limit);
 * the contributors API replaces it once the fetch lands.
 */
function useGithubContributors(): AvatarItem[] {
  const [contributors, setContributors] = useState<AvatarItem[]>([
    { name: 'imstillashish', src: 'https://github.com/imstillashish.png?size=72' },
  ]);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=6`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!Array.isArray(list) || list.length === 0) return;
        setContributors(
          list.map((c: { login: string; avatar_url: string }) => ({
            name: c.login,
            src: `${c.avatar_url}${c.avatar_url.includes('?') ? '&' : '?'}s=72`,
          }))
        );
      })
      .catch(() => {});
  }, []);

  return contributors;
}

export type MinimalFooterVariant = 'Bar' | 'Centered';

export interface MinimalFooterCluster {
  title: string;
  links: { label: string; href: string }[];
}

export interface MinimalFooterProps {
  brand: string;
  clusters: MinimalFooterCluster[];
  status?: string;
  copyright?: string;
  variant?: MinimalFooterVariant;
  className?: string;
}

export function MinimalFooter({
  brand,
  clusters,
  status = 'All systems normal',
  copyright,
  variant = 'Bar',
  className,
}: MinimalFooterProps) {
  const [open, setOpen] = useState<string | null>(null);
  const contributors = useGithubContributors();
  const centered = variant === 'Centered';

  return (
  <footer
  className={cn(
  'w-full border-t border-black/[0.08] bg-white text-foreground  ',
  className,
  )}
  >
  <div className="mx-auto w-full max-w-[1180px] px-6 py-7">
  <div
  className={cn(
  'flex flex-wrap items-center gap-x-6 gap-y-3',
  centered ? 'justify-center' : 'justify-between',
  )}
  >
  <div
  className={cn('flex items-center gap-3', centered && 'order-2 w-full justify-center')}
  >
  <a href="/" className="relative inline-flex items-center gap-2 rounded-md transition-opacity duration-150 hover:opacity-70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 after:absolute after:-inset-y-2 after:-inset-x-2 after:content-['']">
  <MorMark className="size-7 shrink-0 text-foreground" />
  <span className="whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.3px]">
  {brand}
  </span>
  </a>
  <span className="text-[12px] tabular-nums text-muted-foreground ">
  {copyright ?? `© ${brand}`}
  </span>
  </div>

  <nav
  aria-label="Footer"
  className={cn(
  'flex flex-wrap items-center gap-x-1 gap-y-1',
  centered && 'order-1 justify-center',
  )}
  >
  {clusters.map((cluster) => {
  const isOpen = open === cluster.title;
  return (
  /**
  * A real Popover rather than an absolutely positioned div.
  *
  * The hand-rolled version had to measure the trigger against the
  * viewport to decide whether to open up or down, and it opened on
  * `mouseenter` — which a touch fires *before* the click, so every
  * tap opened and immediately closed it. Radix handles the flip
  * with collision detection, dismisses on outside click and Escape,
  * and returns focus to the trigger, none of which the div did.
  */
  <Popover
  key={cluster.title}
  open={isOpen}
  onOpenChange={(next) => setOpen(next ? cluster.title : null)}
  >
  <PopoverTrigger
  /* Hover still opens it on a mouse; `pointerType` keeps that
  off touch, where it would fight the tap. */
  onPointerEnter={(event) => {
  if (event.pointerType === 'mouse') setOpen(cluster.title);
  }}
  className={cn(
  'relative h-8 cursor-pointer rounded-lg px-2.5 text-[13px] transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 after:absolute after:-inset-y-1.5 after:-inset-x-1',
  "after:content-['']",
  isOpen
  ? 'bg-black/[0.05] text-foreground  '
  : 'text-muted-foreground hover:text-foreground  ',
  )}
  >
  {cluster.title}
  </PopoverTrigger>

  <PopoverContent
  align="start"
  sideOffset={6}
  onOpenAutoFocus={(event) => event.preventDefault()}
  onPointerLeave={() => setOpen(null)}
  className="w-auto min-w-[168px] rounded-xl border-black/[0.08] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-8px_rgba(0,0,0,0.16)]  "
  >
  <ul>
  {cluster.links.map((link) => (
  <li key={link.label}>
  <a
  href={link.href}
  className="block rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-black/[0.04] hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400  "
  >
  {link.label}
  </a>
  </li>
  ))}
  </ul>
  </PopoverContent>
  </Popover>
  );
  })}
  </nav>

  <div className={cn('flex items-center gap-4', centered && 'order-3')}>
  {status && (
  <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-muted-foreground ">
  <span aria-hidden className="size-1.5 rounded-full bg-success" />
  {status}
  </span>
  )}  {/* sm + a 8px tap expansion reaches 44x44; the stack's 14px gaps keep
      neighbouring zones from claiming each other's tap points. The status
      line yields on phone so five 42px slots fit without squeezing. */}
  <AvatarStack
  items={contributors}
  size="sm"
  max={5}
  onAvatarClick={(item) => window.open(`https://github.com/${item.name}`, '_blank', 'noopener')}
  />
  </div>
  </div>
  </div>
  </footer>
  );
}

export default MinimalFooter;
