import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ForwardedRef,
} from "react";
import { useAnimation, useReducedMotion } from "motion/react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";

export function useAnimatedIcon(
  ref: ForwardedRef<AnimatedIconHandle>,
  props: AnimatedIconProps
) {
  const { isHovered, onMouseEnter, onMouseLeave, onFocus, onBlur } = props;
  const controls = useAnimation();
  const shouldReduceMotion = useReducedMotion();
  const [internalHover, setInternalHover] = useState(false);

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      if (!shouldReduceMotion) {
        controls.start("animate");
      }
    },
    stopAnimation: () => {
      controls.start("normal");
    },
  }));

  const activeHover = isHovered !== undefined ? isHovered : internalHover;

  useEffect(() => {
    if (shouldReduceMotion) {
      controls.start("normal");
      return;
    }
    if (activeHover) {
      controls.start("animate");
    } else {
      controls.start("normal");
    }
  }, [activeHover, controls, shouldReduceMotion]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isHovered === undefined) {
        setInternalHover(true);
      }
      onMouseEnter?.(e);
    },
    [isHovered, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isHovered === undefined) {
        setInternalHover(false);
      }
      onMouseLeave?.(e);
    },
    [isHovered, onMouseLeave]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (isHovered === undefined) {
        setInternalHover(true);
      }
      onFocus?.(e);
    },
    [isHovered, onFocus]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (isHovered === undefined) {
        setInternalHover(false);
      }
      onBlur?.(e);
    },
    [isHovered, onBlur]
  );

  return {
    controls,
    activeHover,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,
  };
}

