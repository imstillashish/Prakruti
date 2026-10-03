import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

export interface LayoutSidebarCollapseProps extends AnimatedIconProps {
  /**
   * When true, navigation is expanded, so icon indicates collapsing to the left.
   * When false, navigation is collapsed, so icon indicates expanding to the right.
   * Defaults to true.
   */
  expanded?: boolean;
  /**
   * Which side the sidebar is located on ('left' | 'right').
   * Defaults to 'left'.
   */
  side?: "left" | "right";
}

const LayoutSidebarCollapseIcon = forwardRef<
  AnimatedIconHandle,
  LayoutSidebarCollapseProps
>(
  (
    {
      size = 24,
      color = "currentColor",
      strokeWidth = 2,
      className = "",
      expanded = true,
      side = "left",
      ...props
    },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const isLeft = side === "left";
    // Left rail:
    // expanded (collapse): chevron points left (M15 10l-2 2l2 2)
    // collapsed (expand): chevron points right (M13 10l2 2l-2 2)
    const nudgeDirection = isLeft ? (expanded ? -2 : 2) : expanded ? 2 : -2;

    const start = useCallback(async () => {
      animate(
        ".chevron",
        { x: [0, nudgeDirection, 0], opacity: [1, 0.7, 1] },
        { duration: 1.2, ease: "easeInOut" },
      );
      animate(
        ".sidebar",
        { x: [0, nudgeDirection > 0 ? 1 : -1, 0] },
        { duration: 1.4, ease: "easeInOut" },
      );
    }, [animate, nudgeDirection]);

    const stop = useCallback(() => {
      animate(".chevron", { x: 0, opacity: 1 }, { duration: 0.2 });
      animate(".sidebar", { x: 0 }, { duration: 0.2 });
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

    const dividerX = isLeft ? 9 : 15;
    const chevronD = isLeft
      ? expanded
        ? "M15 10l-2 2l2 2"
        : "M13 10l2 2l-2 2"
      : expanded
        ? "M9 10l2 2l-2 2"
        : "M11 10l-2 2l2 2";

    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer shrink-0 ${className}`}
        {...props}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        {/* Outer frame */}
        <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
        {/* Sidebar divider rail */}
        <motion.path className="sidebar" d={`M${dividerX} 4v16`} />
        {/* Directional collapse/expand chevron */}
        <motion.path
          className="chevron"
          d={chevronD}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />
      </motion.svg>
    );
  },
);

LayoutSidebarCollapseIcon.displayName = "LayoutSidebarCollapseIcon";

export default LayoutSidebarCollapseIcon;
