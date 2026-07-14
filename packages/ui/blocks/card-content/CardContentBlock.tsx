import type { ReactNode } from "react"

import { CardContent as ShadcnCardContent } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardContentAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardContentBlock({
  children,
  className,
}: CardContentAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <ShadcnCardContent
      className={cn(wrapperClassName || undefined, className)}
    >
      {children}
    </ShadcnCardContent>
  )
}
