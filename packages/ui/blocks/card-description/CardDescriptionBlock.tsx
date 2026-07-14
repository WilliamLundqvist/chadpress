import type { ReactNode } from "react"

import { CardDescription as ShadcnCardDescription } from "@repo/ui/components/ui/card"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { CardDescriptionAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

export function CardDescriptionBlock({
  cardDescription,
  className,
  slots,
}: CardDescriptionAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  const html = typeof cardDescription === "string" ? cardDescription : ""
  const content = slots?.cardDescription

  if (content !== undefined) {
    return (
      <ShadcnCardDescription className={cn(wrapperClassName || undefined, className)}>
        {content}
      </ShadcnCardDescription>
    )
  }

  return (
    <ShadcnCardDescription
      className={cn(wrapperClassName || undefined, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
