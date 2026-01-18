import { motion, HTMLMotionProps, Variants, AnimatePresence } from "framer-motion";
import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/hooks/usePerformanceMode";

// Animation Variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

// Instant variants for reduced motion
const instantVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 }
};

// Default transition
const defaultTransition = {
  duration: 0.4,
  ease: "easeOut" as const
};

const instantTransition = {
  duration: 0
};

// Hook to check reduced motion preference
function useReducedMotion() {
  try {
    const { reducedMotion } = useAppSettings();
    return reducedMotion;
  } catch {
    // Fallback if used outside provider
    return false;
  }
}

// Page wrapper with fade animation
interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn("w-full", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
PageTransition.displayName = "PageTransition";

// Fade In component
interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = 0.4, direction = "up", className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    const variants = {
      up: fadeInUp,
      down: fadeInDown,
      left: fadeInLeft,
      right: fadeInRight,
      none: fadeIn
    };

    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={variants[direction]}
        transition={{ ...defaultTransition, delay, duration }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = "FadeIn";

// Scale In component
interface ScaleInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, delay = 0, duration = 0.4, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={scaleIn}
        transition={{ ...defaultTransition, delay, duration }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
ScaleIn.displayName = "ScaleIn";

// Stagger container for list animations
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, fast = false, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={fast ? staggerContainerFast : staggerContainer}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

// Stagger item for use inside StaggerContainer
interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        variants={fadeInUp}
        transition={defaultTransition}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = "StaggerItem";

// Hover scale component
interface HoverScaleProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export const HoverScale = forwardRef<HTMLDivElement, HoverScaleProps>(
  ({ children, scale = 1.02, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverScale.displayName = "HoverScale";

// Slide in from side
interface SlideInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  from?: "left" | "right";
  delay?: number;
  className?: string;
}

export const SlideIn = forwardRef<HTMLDivElement, SlideInProps>(
  ({ children, from = "left", delay = 0, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: from === "left" ? -30 : 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...defaultTransition, delay }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
SlideIn.displayName = "SlideIn";

// Pop in with bounce
interface PopInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export const PopIn = forwardRef<HTMLDivElement, PopInProps>(
  ({ children, delay = 0, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay,
          duration: 0.4,
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
PopIn.displayName = "PopIn";

// Animated list wrapper
interface AnimatedListProps extends HTMLMotionProps<"ul"> {
  children: ReactNode;
  className?: string;
}

export const AnimatedList = forwardRef<HTMLUListElement, AnimatedListProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <ul ref={ref} className={className} {...props as any}>
          {children}
        </ul>
      );
    }
    
    return (
      <motion.ul
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className={className}
        {...props}
      >
        {children}
      </motion.ul>
    );
  }
);
AnimatedList.displayName = "AnimatedList";

// Animated list item
interface AnimatedListItemProps extends HTMLMotionProps<"li"> {
  children: ReactNode;
  className?: string;
}

export const AnimatedListItem = forwardRef<HTMLLIElement, AnimatedListItemProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <li ref={ref} className={className} {...props as any}>
          {children}
        </li>
      );
    }
    
    return (
      <motion.li
        ref={ref}
        variants={fadeInUp}
        transition={defaultTransition}
        className={className}
        {...props}
      >
        {children}
      </motion.li>
    );
  }
);
AnimatedListItem.displayName = "AnimatedListItem";

// Animated grid wrapper
interface AnimatedGridProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export const AnimatedGrid = forwardRef<HTMLDivElement, AnimatedGridProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedGrid.displayName = "AnimatedGrid";

// Animated card with hover effect
interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, hoverEffect = true, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props as any}>
          {children}
        </div>
      );
    }
    
    return (
      <motion.div
        ref={ref}
        variants={fadeInUp}
        whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
        transition={defaultTransition}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";

// Export motion for custom use
export { motion, AnimatePresence } from "framer-motion";
