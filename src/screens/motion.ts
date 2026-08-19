import type { Transition, Variants } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const BLUR_PEAK = 24;

export const blurInTransition: Transition = {
  duration: 1.1,
  ease: EASE_OUT,
};

export const blurOutTransition: Transition = {
  duration: 0.55,
  ease: EASE_IN,
};

export const blurInVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: `blur(${BLUR_PEAK}px)`,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: blurInTransition,
  },
  exit: {
    opacity: 0,
    filter: `blur(${BLUR_PEAK}px)`,
    scale: 1.02,
    transition: blurOutTransition,
  },
};
