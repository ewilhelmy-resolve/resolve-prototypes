import * as React from "react"

import { cn } from "@/lib/utils"

interface AspectRatioProps extends React.ComponentProps<"div"> {
  ratio?: number
}

function AspectRatio({
  className,
  ratio = 1,
  style,
  children,
  ...props
}: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      className={cn("relative w-full", className)}
      style={{ aspectRatio: String(ratio), ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export { AspectRatio }
