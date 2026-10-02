import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const SunIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(
        ".sun-center",
        { scale: [1, 0.85, 1.1, 1] },
        { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
      );
      animate(
        ".sun-rays",
        { opacity: [1, 0.4, 1], scale: [1, 1.08, 1] },
        { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(".sun-center", { scale: 1 }, { duration: 0.2, ease: "easeOut" });
      animate(".sun-rays", { opacity: 1, scale: 1 }, { duration: 0.2, ease: "easeOut" });
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
        style={{ overflow: "visible" }}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.path
          className="sun-center"
          d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"
          style={{ transformOrigin: "12px 12px" }}
        />
        <motion.g className="sun-rays" style={{ transformOrigin: "12px 12px" }}>
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
        </motion.g>
      </motion.svg>
    );
  },
);

SunIcon.displayName = "SunIcon";
export default SunIcon;
