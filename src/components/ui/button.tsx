import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 press-effect",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-sm shadow-emerald-300/20 hover:shadow-md hover:shadow-emerald-400/25 hover:-translate-y-0.5 shine-effect",
        destructive:
          "bg-rose-400 text-white hover:bg-rose-500 shadow-sm shadow-rose-300/20 hover:shadow-md hover:-translate-y-0.5",
        outline:
          "border border-emerald-300/40 bg-white/60 dark:bg-emerald-950/30 backdrop-blur-sm hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40 hover:border-emerald-400/50 hover:text-emerald-700 dark:hover:text-emerald-300 hover:-translate-y-0.5",
        secondary:
          "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/50 shadow-sm shadow-emerald-200/30 hover:-translate-y-0.5",
        ghost: "hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 magnetic-hover",
        link: "text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline hover:text-emerald-700 dark:hover:text-emerald-300",
        glass: "bg-white/40 dark:bg-emerald-950/40 backdrop-blur-md border border-emerald-200/30 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-300 hover:bg-white/60 dark:hover:bg-emerald-900/50 hover:border-emerald-300/50 shadow-sm shadow-emerald-200/20 shine-effect",
        cyan: "bg-gradient-to-r from-cyan-400 to-teal-400 text-white shadow-sm shadow-cyan-300/20 hover:shadow-md hover:shadow-cyan-400/25 hover:-translate-y-0.5 shine-effect",
        emerald: "bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-sm shadow-emerald-300/20 hover:shadow-md hover:shadow-emerald-400/25 hover:-translate-y-0.5 shine-effect",
        purple: "bg-gradient-to-r from-violet-400 to-purple-400 text-white shadow-sm shadow-violet-300/20 hover:shadow-md hover:shadow-violet-400/25 hover:-translate-y-0.5 shine-effect",
        gold: "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-300/20 hover:shadow-md hover:shadow-amber-400/25 hover:-translate-y-0.5 shine-effect",
        mint: "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/40 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/50 shadow-sm shadow-emerald-200/20 hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }