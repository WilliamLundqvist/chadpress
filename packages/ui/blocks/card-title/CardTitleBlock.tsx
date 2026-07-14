import type { ReactNode } from "react"

import { CardTitle as ShadcnCardTitle } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardTitleAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardTitleBlock({
  cardTitle,
  className,
  slots,
}: CardTitleAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  const html = typeof cardTitle === "string" ? cardTitle : ""
  const content = slots?.cardTitle

  if (content !== undefined) {
    return (
      <ShadcnCardTitle className={cn(wrapperClassName || undefined, className)}>
        {content}
      </ShadcnCardTitle>
    )
  }

  return (
    <ShadcnCardTitle
      className={cn(wrapperClassName || undefined, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
