import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const BuildingIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(
        ".building",
        { scaleY: [1, 1.15, 1], y: [0, -1.5, 0] },
        { duration: 0.4, ease: "easeInOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(
        ".building",
        { scaleY: 1, y: 0 },
        { duration: 0.25, ease: "easeIn" },
      );
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

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
        className={`cursor-pointer ${className}`}
      >
        <motion.path
          className="building"
          style={{ transformOrigin: "bottom" }}
          d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M2 21h20M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M10 21v-3h4v3"
        />
      </motion.svg>
    );
  },
);

BuildingIcon.displayName = "BuildingIcon";
export default BuildingIcon;
