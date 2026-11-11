import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { shellSpring } from "../motion";

export function ShellViewport({ children, expanded, scrollable = true, id = "workspace" }: { children: ReactNode; expanded: boolean; scrollable?: boolean; id?: string }) {
  const reduced = useReducedMotion();
  return <motion.main id={id} tabIndex={-1} initial={false}
    animate={{ borderRadius: expanded ? 32 : 24 }} transition={reduced ? { duration: 0 } : shellSpring}
    className="shell-viewport relative z-10 flex-1 min-h-0 min-w-0 overflow-hidden">
    <div className="shell-atmosphere" aria-hidden="true"><div className="shell-glow" /><div className="shell-grain" /></div>
    <div className={`relative z-10 h-full w-full ${scrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"}`}>{children}</div>
  </motion.main>;
}
