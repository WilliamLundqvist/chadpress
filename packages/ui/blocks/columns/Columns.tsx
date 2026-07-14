import type { ReactNode } from "react"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { columnsVariants } from "./columns-variants"
import type { ColumnsAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind
type ColumnsVariants = VariantProps<typeof columnsVariants>

export function Columns({
  alignItems,
  gap,
  stackOnMobile,
  children,
  className,
}: ColumnsAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="columns"
      className={cn(
        columnsVariants({
          alignItems: alignItems as ColumnsVariants["alignItems"],
          gap: gap as ColumnsVariants["gap"],
          stackOnMobile,
        }),
        wrapperClassName || undefined,
        className,
      )}
    >
      {children}
    </div>
  )
}
