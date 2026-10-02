import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const UsersIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      animate(".user-center", { y: -2, scale: 1.05 }, { duration: 0.25, ease: "easeOut" });
      animate(".user-left", { x: -1, scale: 1.02 }, { duration: 0.3, ease: "easeOut", delay: 0.05 });
      animate(".user-right", { x: 1, scale: 1.02 }, { duration: 0.3, ease: "easeOut", delay: 0.05 });
    }, [animate]);

    const stop = useCallback(() => {
      animate(".user-center, .user-left, .user-right", { x: 0, y: 0, scale: 1 }, { duration: 0.2, ease: "easeInOut" });
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
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <motion.g className="user-center">
          <circle cx="12" cy="11" r="2" />
          <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
        </motion.g>
        <motion.g className="user-right">
          <circle cx="17" cy="7" r="2" />
          <path d="M17 12h2a2 2 0 0 1 2 2v1" />
        </motion.g>
        <motion.g className="user-left">
          <circle cx="7" cy="7" r="2" />
          <path d="M3 15v-1a2 2 0 0 1 2 -2h2" />
        </motion.g>
      </motion.svg>
    );
  },
);

UsersIcon.displayName = "UsersIcon";
export default UsersIcon;
