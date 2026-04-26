import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { getColumnClassName, getColumnInlineStyle } from "./column-style"
import type { ColumnAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function Column({
  width,
  verticalAlignment,
  style,
  children,
  className,
}: ColumnAttributes & { children?: ReactNode; className?: string }) {
  const w = typeof width === "string" ? width : undefined
  const v = typeof verticalAlignment === "string" ? verticalAlignment : undefined
  const styleInline = getColumnInlineStyle({
    width: w,
    verticalAlignment: v,
    blockStyle: style,
  })
  const colClasses = getColumnClassName(v)

  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        colClasses,
        wrapperClassName || undefined,
        className,
      )}
      style={Object.keys(styleInline).length > 0 ? styleInline : undefined}
    >
      {children}
    </div>
  )
}
