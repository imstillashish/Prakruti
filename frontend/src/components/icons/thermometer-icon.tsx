import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const ThermometerIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(
        ".mercury-level",
        { scaleY: [1, 1.8, 1], y: [0, -2, 0] },
        { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(".mercury-level", { scaleY: 1, y: 0 }, { duration: 0.25 });
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
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        <motion.line
          className="mercury-level"
          style={{ transformOrigin: "12px 14px" }}
          x1="12"
          y1="9"
          x2="12"
          y2="13"
        />
      </motion.svg>
    );
  },
);

ThermometerIcon.displayName = "ThermometerIcon";
export default ThermometerIcon;
