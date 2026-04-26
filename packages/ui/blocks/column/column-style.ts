import type { CSSProperties } from "react"

import { cn } from "@repo/ui/lib/utils"

type Raw = Record<string, unknown>

function isObj(x: unknown): x is Raw {
  return x !== null && typeof x === "object" && !Array.isArray(x)
}

const vAlign: Record<string, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
  stretch: "justify-stretch",
}

export function getColumnClassName(verticalAlignment: string | undefined): string {
  if (!verticalAlignment) {
    return "flex min-h-0 flex-col"
  }
  return cn("flex min-h-0 flex-col", vAlign[verticalAlignment] ?? "justify-stretch")
}

export function getColumnInlineStyle(opts: {
  width: string | undefined
  verticalAlignment: string | undefined
  blockStyle: unknown
}): CSSProperties {
  const { width, blockStyle } = opts
  const out: CSSProperties = { minWidth: 0 }

  if (typeof width === "string" && width.trim() !== "") {
    out.flexBasis = width
    out.width = width
    out.flexGrow = 1
    out.flexShrink = 1
  } else {
    out.flex = "1 1 0%"
  }

  if (isObj(blockStyle)) {
    const spacing = blockStyle.spacing
    if (isObj(spacing) && isObj(spacing.padding)) {
      const p = spacing.padding
      for (const key of Object.keys(p)) {
        if (key === "top" && typeof p.top === "string")
          out.paddingTop = p.top
        if (key === "right" && typeof p.right === "string")
          out.paddingRight = p.right
        if (key === "bottom" && typeof p.bottom === "string")
          out.paddingBottom = p.bottom
        if (key === "left" && typeof p.left === "string")
          out.paddingLeft = p.left
      }
    }
  }

  return out
}
