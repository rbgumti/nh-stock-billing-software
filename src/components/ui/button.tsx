import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 press-effect",
  {
    variants: {
      variant: {
        default: "btn-primary shine-effect",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        outline:
          "border border-input bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/30 hover:text-foreground hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:-translate-y-0.5",
        ghost: "hover:bg-primary/10 hover:text-foreground magnetic-hover",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "btn-glass shine-effect",
        cyan: "bg-gradient-to-r from-cyan to-teal text-white shadow-sm hover:shadow-lg hover:shadow-cyan/25 hover:-translate-y-0.5 shine-effect",
        emerald: "bg-gradient-to-r from-emerald to-teal text-white shadow-sm hover:shadow-lg hover:shadow-emerald/25 hover:-translate-y-0.5 shine-effect",
        purple: "bg-gradient-to-r from-purple to-primary text-white shadow-sm hover:shadow-lg hover:shadow-purple/25 hover:-translate-y-0.5 shine-effect",
        gold: "bg-gradient-to-r from-gold to-orange text-white shadow-sm hover:shadow-lg hover:shadow-gold/25 hover:-translate-y-0.5 shine-effect",
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