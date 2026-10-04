'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
  type MutableRefObject,
  type Ref,
} from 'react';
import { useReducedMotion } from 'motion/react';
import type { AnimatedIconHandle, AnimatedIconProps } from './types';

/**
 * The row a pointer would read as "this icon's row": the control it sits in,
 * else the heading it sits in, else whatever it sits beside.
 *
 * The control wins over a heading in the usual case, so hovering one button in
 * a header never animates its neighbours' icons. The exception is the glyph-only
 * button inside a heading — the `Explain` affordance at the end of every panel
 * title is a 13px button, and a reader pointing at the title is pointing at the
 * heading, not at that button. A heading *inside* a control (an accordion
 * button wrapping its own `h3`) goes the other way: the control is the row.
 */
function hoverTargetFor(node: HTMLElement): HTMLElement {
  const control = node.closest<HTMLElement>('button, a, [role="button"], summary, label');
  const heading = node.closest<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]');

  if (heading && !(control && control.contains(heading))) return heading;

  return control ?? heading ?? node.parentElement ?? node;
}

/**
 * The vendored ItsHover icons animate from the glyph's own hover.
 *
 * Only a handful of them are ever pointed at directly — a `Search` inside a
 * text field, a map pin on the map. Everywhere else the icon sits inside a
 * button beside its label ("Inspect Model Evidence", "Refresh status") or
 * inside a panel heading, so the animation only fired when the cursor found
 * the glyph itself, which is a fraction of the control it belongs to.
 *
 * `AnimatedIcon` re-exports an icon behind a host that listens on that row
 * instead. `display: contents` keeps the host out of layout entirely: an
 * absolutely positioned glyph (`absolute left-3 top-1/2`) still measures
 * against the same ancestor, a flex row still lays out the SVG itself, and the
 * icon's own hover and imperative ref keep working unchanged.
 *
 * Reduced motion skips the host outright, so this adds no animation for users
 * who asked for none.
 */
export function AnimatedIcon<
  Props extends AnimatedIconProps = AnimatedIconProps,
>(Icon: ComponentType<Props & { ref?: Ref<AnimatedIconHandle> }>) {
  const HostedIcon = forwardRef<AnimatedIconHandle, Props>(
    function HostedIcon(props, ref) {
      const host = useRef<HTMLSpanElement>(null);
      // The host needs its own handle whether or not the call site passed a
      // ref, so both go through one callback ref.
      const icon = useRef<AnimatedIconHandle>(null);
      const reduceMotion = useReducedMotion();

      const attach = useCallback(
        (node: AnimatedIconHandle | null) => {
          icon.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as MutableRefObject<AnimatedIconHandle | null>).current = node;
        },
        [ref],
      );

      useEffect(() => {
        if (reduceMotion) return;
        const node = host.current;
        if (!node) return;
        const target = hoverTargetFor(node);

        const onOver = (event: MouseEvent) => {
          const from = event.relatedTarget as Node | null;
          // Already inside the row — crossing the label or the glyph itself
          // must not restart the animation.
          if (from && target.contains(from)) return;
          icon.current?.startAnimation();
        };

        const onOut = (event: MouseEvent) => {
          const to = event.relatedTarget as Node | null;
          if (to && target.contains(to)) {
            // Left the glyph but stayed on the row: the icon's own hover-end
            // has just stopped it, so start it again for the row.
            if (node.contains(event.target as Node)) icon.current?.startAnimation();
            return;
          }
          icon.current?.stopAnimation();
        };

        target.addEventListener('mouseover', onOver);
        target.addEventListener('mouseout', onOut);
        return () => {
          target.removeEventListener('mouseover', onOver);
          target.removeEventListener('mouseout', onOut);
        };
      }, [reduceMotion]);

      return (
        <span ref={host} style={{ display: 'contents' }}>
          {/* `Props` is opaque here, so the spread needs the cast the wrapper
              exists to hide. The caller's own props are unchanged. */}
          <Icon ref={attach} {...(props as Props & { ref?: Ref<AnimatedIconHandle> })} />
        </span>
      );
    },
  );

  HostedIcon.displayName = `AnimatedIcon(${Icon.displayName ?? 'Icon'})`;
  return HostedIcon;
}