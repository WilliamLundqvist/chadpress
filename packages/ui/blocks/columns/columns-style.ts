import type { CSSProperties } from "react"

type Raw = Record<string, unknown>

function isObj(x: unknown): x is Raw {
  return x !== null && typeof x === "object" && !Array.isArray(x)
}

export function getColumnsInlineStyle(style: unknown): CSSProperties {
  if (!isObj(style)) {
    return {}
  }
  const spacing = style.spacing
  if (!isObj(spacing)) {
    return {}
  }
  const out: CSSProperties = {}
  if (typeof spacing.blockGap === "string" && spacing.blockGap.trim() !== "") {
    out.gap = spacing.blockGap
  }
  return out
}
