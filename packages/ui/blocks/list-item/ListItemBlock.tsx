import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { ListItemAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function ListItemBlock({
  content,
  className,
  slots,
  children,
}: ListItemAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
  children?: ReactNode
}) {
  const contentSlot = slots?.content

  return (
    <li className={cn(wrapperClassName || undefined, className)}>
      {contentSlot !== undefined ? (
        contentSlot
      ) : (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      )}
      {children}
    </li>
  )
}
