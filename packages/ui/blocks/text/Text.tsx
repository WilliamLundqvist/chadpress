import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { TextAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function Text({
  content,
  className,
  slots,
}: TextAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  const contentSlot = slots?.content
  const classes = cn("scroll-m-20", wrapperClassName || undefined, className)

  if (contentSlot !== undefined) {
    return <p className={classes}>{contentSlot}</p>
  }

  return <p className={classes} dangerouslySetInnerHTML={{ __html: content }} />
}
