import type { ReactNode } from "react"

import { Card as ShadcnCard } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardBlock({
  children,
  className,
}: CardAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <ShadcnCard
      className={cn(wrapperClassName || undefined, className)}
    >
      {children}
    </ShadcnCard>
  )
}
