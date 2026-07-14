import type { ElementType, ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { QuoteAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind

function RichContent({
  slot,
  html,
  as: Tag,
  className,
}: {
  slot: ReactNode | undefined
  html: string
  as: ElementType
  className?: string
}) {
  if (slot !== undefined) {
    return <Tag className={className}>{slot}</Tag>
  }

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function Quote({
  quote,
  citation,
  className,
  slots,
}: QuoteAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  return (
    <blockquote
      className={cn(
        "mt-6 border-s-2 ps-6 italic",
        wrapperClassName || undefined,
        className,
      )}
    >
      <RichContent slot={slots?.quote} html={quote} as="p" />
      <RichContent
        slot={slots?.citation}
        html={citation}
        as="cite"
        className="mt-2 text-sm not-italic text-muted-foreground"
      />
    </blockquote>
  )
}
