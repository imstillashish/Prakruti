import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// DESIGN.md v3 signal badges: pill geometry, tinted backgrounds, dark AA text.
// success = OK/active, warning = watch, destructive = hazard, water = rainfall data.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        secondary: "border-border bg-secondary text-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        warning: "border-warning/20 bg-warning/10 text-warning",
        success: "border-success/20 bg-success/10 text-data-ok-text",
        water: "border-data-rain/20 bg-data-rain/10 text-data-rain-dark",
        rain: "border-data-rain/20 bg-data-rain/10 text-data-rain-dark",
        outline: "border-border text-foreground",
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
