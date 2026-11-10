import type { HTMLAttributes } from "react";
import type { Transition } from "motion/react";

export interface AnimatedIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  className?: string;
  isHovered?: boolean;
}

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * Micro-spring physics configuration conforming to Rule 5 of guidelines.md
 * (stiffness ~400, damping ~25 for crisp, tactile, zero-lag micro-interactions)
 */
export const iconSpringTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};
