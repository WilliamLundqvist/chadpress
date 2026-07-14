import type { ReactNode } from "react"

import { CardHeader as ShadcnCardHeader } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardHeaderAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardHeaderBlock({
  children,
  className,
}: CardHeaderAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <ShadcnCardHeader
      className={cn(wrapperClassName || undefined, className)}
    >
      {children}
    </ShadcnCardHeader>
  )
}
