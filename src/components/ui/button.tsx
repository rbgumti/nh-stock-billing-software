import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 press-effect",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm shadow-blue-300/20 hover:shadow-md hover:shadow-blue-400/25 hover:-translate-y-0.5 shine-effect",
        destructive:
          "bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-300/20 hover:shadow-md hover:-translate-y-0.5",
        outline:
          "border border-blue-300/40 bg-white/60 dark:bg-blue-950/30 backdrop-blur-sm hover:bg-blue-50/80 dark:hover:bg-blue-900/40 hover:border-blue-400/50 hover:text-blue-700 dark:hover:text-blue-300 hover:-translate-y-0.5",
        secondary:
          "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200/80 dark:hover:bg-blue-800/50 shadow-sm shadow-blue-200/30 hover:-translate-y-0.5",
        ghost: "hover:bg-blue-100/60 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 magnetic-hover",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline hover:text-blue-700 dark:hover:text-blue-300",
        glass: "bg-white/40 dark:bg-blue-950/40 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30 text-blue-700 dark:text-blue-300 hover:bg-white/60 dark:hover:bg-blue-900/50 hover:border-blue-300/50 shadow-sm shadow-blue-200/20 shine-effect",
        cyan: "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-300/20 hover:shadow-md hover:shadow-cyan-400/25 hover:-translate-y-0.5 shine-effect",
        emerald: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-300/20 hover:shadow-md hover:shadow-emerald-400/25 hover:-translate-y-0.5 shine-effect",
        purple: "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm shadow-violet-300/20 hover:shadow-md hover:shadow-violet-400/25 hover:-translate-y-0.5 shine-effect",
        gold: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-300/20 hover:shadow-md hover:shadow-amber-400/25 hover:-translate-y-0.5 shine-effect",
        mint: "bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/40 hover:bg-blue-200/80 dark:hover:bg-blue-800/50 shadow-sm shadow-blue-200/20 hover:-translate-y-0.5",
        ocean: "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-sm shadow-blue-300/20 hover:shadow-md hover:shadow-blue-400/25 hover:-translate-y-0.5 shine-effect",
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