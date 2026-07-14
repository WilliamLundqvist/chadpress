import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { listVariants } from "./list-variants"
import type { ListAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function ListBlock({
  ordered,
  children,
  className,
  ...rest
}: ListAttributes & {
  children?: ReactNode
  className?: string
} & Record<string, unknown>) {
  const Tag = ordered ? "ol" : "ul"

  return (
    <Tag
      data-slot="list"
      className={cn(
        listVariants({ ordered }),
        wrapperClassName || undefined,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
