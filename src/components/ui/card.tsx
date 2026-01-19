import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-2xl text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border bg-card shadow-sm hover:shadow-md",
        glass: "glass border-0 hover:border-emerald-500/20 hover:shadow-lg",
        "glass-strong": "glass-strong border-0 hover:border-emerald-500/25",
        "glass-subtle": "glass-subtle border-0",
        gradient: "gradient-border",
        interactive: "glass interactive-card",
        elevated: "glass-strong shadow-elevated hover:shadow-glow-green",
        mint: "glass-emerald border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/20",
        teal: "glass-teal border border-teal-500/20 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/20",
        cyan: "glass-cyan border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/20"
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-lg",
        glow: "hover-glow",
        scale: "hover:scale-[1.02]",
        "glow-cyan": "hover-glow-cyan",
        "glow-emerald": "hover-glow-emerald",
        "glow-gold": "hover-glow-gold",
        "glow-purple": "hover-glow-purple",
        "glow-mint": "hover:shadow-lg hover:shadow-emerald-500/25",
        "glow-teal": "hover:shadow-lg hover:shadow-teal-500/25"
      }
    },
    defaultVariants: {
      variant: "glass",
      hover: "none"
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }