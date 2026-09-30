import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Signal colors: green = OK/active, amber = watch, earth red = hazard, water = rainfall data
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius)] border px-2 py-0.5 font-mono text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        warning: "border-transparent bg-warning text-foreground",
        success: "border-transparent bg-accent text-accent-foreground",
        water: "border-transparent bg-water text-white",
        outline: "text-foreground",
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
