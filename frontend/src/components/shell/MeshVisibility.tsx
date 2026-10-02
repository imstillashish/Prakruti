'use client';
/**
 * Pauses mesh fills that scroll out of view.
 *
 * One IntersectionObserver handles every `.gradient-animated-*` control on the
 * page — an observer per control would mean dozens on a control-dense screen —
 * and one MutationObserver re-scans when the tree changes, because switching
 * pages swaps most of the DOM. The attribute is the whole interface: CSS does
 * the pausing, so this component never touches an animation directly.
 *
 * Every mesh fill is watched, not just the always-on utilities: an active nav
 * item or segment keeps its loop running while the page scrolls past it, and
 * that is where most of the live loops on a page actually are.
 */
import { useEffect } from 'react';

const SELECTOR = [
  '.gradient-animated-ocean',
  '.gradient-animated-emerald',
  '.gradient-animated-amber',
  '.gradient-animated-neutral',
  '.gradient-state',
  '.gradient-on-active',
  '.gradient-on-checked',
].join(', ');

export function MeshVisibility() {
  useEffect(() => {
    const watched = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.setAttribute('data-offscreen', entry.isIntersecting ? 'false' : 'true');
      }
    });

    const watch = (el: Element) => {
      if (watched.has(el)) return;
      watched.add(el);
      observer.observe(el);
    };

    const scan = () => {
      if (document.documentElement.matches(SELECTOR)) watch(document.documentElement);
      document.querySelectorAll(SELECTOR).forEach(watch);
    };

    // Mutations can arrive in bursts (a page mount), so rescans coalesce into
    // one pass per frame rather than one per added node.
    let queued = 0;
    const mutation = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    });

    scan();
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      observer.disconnect();
      if (queued) cancelAnimationFrame(queued);
      document.querySelectorAll(SELECTOR).forEach((el) => el.removeAttribute('data-offscreen'));
    };
  }, []);

  return null;
}
