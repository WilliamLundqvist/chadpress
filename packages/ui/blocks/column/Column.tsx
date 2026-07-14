import type { ReactNode } from "react"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { columnVariants } from "./column-variants"
import type { ColumnAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind
type ColumnVariants = VariantProps<typeof columnVariants>

export function Column({
  width,
  children,
  className,
}: ColumnAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="column"
      className={cn(
        columnVariants({ width: width as ColumnVariants["width"] }),
        wrapperClassName || undefined,
        className,
      )}
    >
      {children}
    </div>
  )
}
