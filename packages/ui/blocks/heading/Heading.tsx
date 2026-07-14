import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { headingVariants } from "./heading-variants"
import type { HeadingAttributes } from "./types"

const { styleMap, className: wrapperClassName } = block.customTailwind

const LEVEL_MIN = 1
const LEVEL_MAX = 6

type LevelKey = keyof typeof styleMap.level
type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`

function clampLevel(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(level)))
  return n as 1 | 2 | 3 | 4 | 5 | 6
}

export function Heading({
  content,
  level,
  className,
  slots,
}: HeadingAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  const n = clampLevel(level)
  const Tag = `h${n}` as HeadingTag
  const variant = styleMap.level[String(n) as LevelKey] as
    | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  const contentSlot = slots?.content
  const classes = cn(
    headingVariants({ variant }),
    wrapperClassName || undefined,
    className,
  )

  if (contentSlot !== undefined) {
    return <Tag className={classes}>{contentSlot}</Tag>
  }

  return <Tag className={classes} dangerouslySetInnerHTML={{ __html: content }} />
}
