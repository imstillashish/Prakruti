import { forwardRef, useImperativeHandle } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { scaledStrokeWidth } from "./types";
import { motion, useAnimate } from "motion/react";

const ZoomInIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = async () => {
      await animate(
        ".zoom-in-group",
        {
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, -5, 0],
        },
        { duration: 0.8, ease: "easeInOut" },
      );
    };

    const stop = () => {
      animate(
        ".zoom-in-group",
        { scale: 1, rotate: 0 },
        { duration: 0.2, ease: "easeOut" },
      );
    };

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
        viewBox="0 0 32 32"
        fill="none"
        stroke={color}
        strokeWidth={scaledStrokeWidth(strokeWidth, 32)}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ overflow: "visible" }}
      >
        <motion.g
          className="zoom-in-group"
          style={{
            transformOrigin: "13px 13px",
            transformBox: "fill-box",
          }}
        >
          <motion.path d="m21.393,18.565l7.021,7.021c.781.781.781,2.047,0,2.828h0c-.781.781-2.047.781-2.828,0l-7.021-7.021" />
          <motion.circle cx="13" cy="13" r="10" strokeLinecap="square" />
          <path d="M13 9v8" />
          <path d="M9 13h8" />
        </motion.g>
      </motion.svg>
    );
  },
);

ZoomInIcon.displayName = "ZoomInIcon";
export default ZoomInIcon;
