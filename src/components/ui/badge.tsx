import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/15 text-primary hover:bg-primary/25",
        secondary:
          "border-secondary/25 bg-secondary/15 text-secondary hover:bg-secondary/25",
        destructive:
          "border-destructive/25 bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline: 
          "border-border bg-card/50 backdrop-blur-sm text-foreground hover:bg-primary/10 hover:border-primary/30",
        cyan:
          "border-cyan/25 bg-cyan/15 text-cyan hover:bg-cyan/25",
        teal:
          "border-teal/25 bg-teal/15 text-teal hover:bg-teal/25",
        emerald:
          "border-emerald/25 bg-emerald/15 text-emerald hover:bg-emerald/25",
        gold:
          "border-gold/25 bg-gold/15 text-gold hover:bg-gold/25",
        purple:
          "border-purple/25 bg-purple/15 text-purple hover:bg-purple/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
