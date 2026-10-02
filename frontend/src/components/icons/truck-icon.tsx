import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const TruckIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      await animate(
        ".truck",
        { x: [0, 24], opacity: [1, 0] },
        { duration: 0.45, ease: "easeIn" },
      );
      animate(".truck", { x: -24 }, { duration: 0 });
      await animate(
        ".truck",
        { x: [-24, 0], opacity: [0, 1] },
        { duration: 0.45, ease: "easeOut", delay: 0.05 },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(".truck", { x: 0, opacity: 1 }, { duration: 0.2, ease: "easeOut" });
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
        <motion.g className="truck">
          <path d="M14 19V7a2 2 0 0 0-2-2H9" />
          <path d="M15 19H9" />
          <path d="M19 19h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14" />
          <path d="M2 13v5a1 1 0 0 0 1 1h2" />
          <circle cx="17" cy="19" r="2" />
          <circle cx="7" cy="19" r="2" />
        </motion.g>
      </motion.svg>
    );
  },
);

TruckIcon.displayName = "TruckIcon";
export default TruckIcon;
