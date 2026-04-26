import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { getColumnsClassName } from "./columns-layout"
import type { ColumnsAttributes } from "./types"
import { getColumnsInlineStyle } from "./columns-style"

const { className: wrapperClassName } = block.customTailwind

export function Columns({
  verticalAlignment,
  isStackedOnMobile,
  style,
  children,
  className,
}: ColumnsAttributes & { children?: ReactNode; className?: string }) {
  const v = typeof verticalAlignment === "string" ? verticalAlignment : undefined
  const stacked = typeof isStackedOnMobile === "boolean" ? isStackedOnMobile : true
  const layoutClasses = getColumnsClassName(v, stacked)
  const inlineStyle = getColumnsInlineStyle(style)

  return (
    <div
      className={cn(wrapperClassName || undefined, layoutClasses, className)}
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
    >
      {children}
    </div>
  )
}
