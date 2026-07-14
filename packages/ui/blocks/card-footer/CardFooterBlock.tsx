import type { ReactNode } from "react"

import { CardFooter as ShadcnCardFooter } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardFooterAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardFooterBlock({
  children,
  className,
}: CardFooterAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <ShadcnCardFooter
      className={cn(wrapperClassName || undefined, className)}
    >
      {children}
    </ShadcnCardFooter>
  )
}
