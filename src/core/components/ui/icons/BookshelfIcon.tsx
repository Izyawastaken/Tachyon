import { forwardRef, useState, useImperativeHandle } from "react";
import { motion } from "motion/react";
import { cn } from "@/core/lib/utils";

export interface BookshelfIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface BookshelfIconProps {
  size?: number;
  className?: string;
  isHovered?: boolean;
}

export const BookshelfIcon = forwardRef<BookshelfIconHandle, BookshelfIconProps>(
  ({ size = 24, className, isHovered = false }, ref) => {
    const [animating, setAnimating] = useState(false);

    useImperativeHandle(ref, () => ({
      startAnimation: () => setAnimating(true),
      stopAnimation: () => setAnimating(false),
    }));

    const isActive = animating || isHovered;

    return (
      <div
        className={cn("inline-flex items-center justify-center select-none pointer-events-none", className)}
        style={{ width: size, height: size }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Standing Book 1 */}
          <path d="M4 4v16" />
          {/* Standing Book 2 */}
          <path d="M8 8v12" />
          {/* Standing Book 3 */}
          <path d="M12 6v14" />
          {/* Leaning Book 4 with interactive tilt animation */}
          <motion.path
            d="m16 6 4 14"
            animate={
              isActive
                ? {
                    rotate: [0, -7, 3, 0],
                    transition: { duration: 0.5, ease: "easeInOut" },
                  }
                : { rotate: 0 }
            }
            style={{ transformOrigin: "16px 20px" }}
          />
        </svg>
      </div>
    );
  }
);

BookshelfIcon.displayName = "BookshelfIcon";
export default BookshelfIcon;

