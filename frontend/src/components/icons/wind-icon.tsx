import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const WindIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(
        ".wind-stream-1",
        { x: [0, 3, 0], opacity: [0.8, 1, 0.8] },
        { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
      );
      animate(
        ".wind-stream-2",
        { x: [0, 4, 0], opacity: [0.7, 1, 0.7] },
        { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
      );
      animate(
        ".wind-stream-3",
        { x: [0, 2.5, 0], opacity: [0.9, 1, 0.9] },
        { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(".wind-stream-1, .wind-stream-2, .wind-stream-3", { x: 0, opacity: 1 }, { duration: 0.25 });
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

    return (
      <motion.svg
        ref={scope}
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
        onHoverStart={start}
        onHoverEnd={stop}
      >
        <motion.path className="wind-stream-1" d="M12.8 4.6a2 2 0 1 1 1.7 2.9H2" />
        <motion.path className="wind-stream-2" d="M17.5 10.5a2.5 2.5 0 1 1 2 4H2" />
        <motion.path className="wind-stream-3" d="M9.8 19.4a2 2 0 1 0 1.7-2.9H2" />
      </motion.svg>
    );
  },
);

WindIcon.displayName = "WindIcon";
export default WindIcon;
