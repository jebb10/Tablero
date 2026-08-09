import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "flex items-start gap-2 rounded-md border px-3.5 py-3 text-[13px] leading-snug",
  {
    variants: {
      variant: {
        warning: "border-warning-bg bg-warning-bg text-warning-text",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive-text",
        success: "border-success/20 bg-success/10 text-success-text",
      },
    },
    defaultVariants: {
      variant: "destructive",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Alert, alertVariants }
