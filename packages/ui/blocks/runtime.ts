import { blockRegistry, type BlockName } from "./registry"
import {
  expandBlockCapabilities,
  type BlockAttributeSpec,
} from "./capabilities"

/** Minimal `block.json` shape needed for defaulting and field lists */
export type BlockMeta = {
  name: string
  attributes: Record<string, BlockAttributeSpec>
  capabilities?: readonly string[]
  supports?: Record<string, unknown> & {
    innerBlocks?: boolean
    allowedBlocks?: string[]
    template?: unknown[]
  }
}

export function isBlockName(name: string): name is BlockName {
  return Object.prototype.hasOwnProperty.call(blockRegistry, name)
}

export function getBlockDefinition(name: string): (typeof blockRegistry)[BlockName] | undefined {
  if (!isBlockName(name)) {
    return undefined
  }
  return blockRegistry[name]
}

export function getBlockAttributeKeys<M extends {
  attributes: Record<string, BlockAttributeSpec>
  capabilities?: readonly string[]
}>(
  meta: M,
): string[] {
  return Object.keys(expandBlockCapabilities(meta).attributes)
}

/**
 * WPGraphQL Content Blocks uses `BlockAttributesObject` for untyped `object` attributes
 * and serializes them with `json_encode` — the GraphQL response often delivers a **string**
 * that must be parsed before React can read `layout`, `style`, etc.
 */
export function parseBlockObjectAttr(value: unknown): Record<string, unknown> | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === "string") {
    const t = value.trim()
    if (t === "") {
      return undefined
    }
    try {
      const p = JSON.parse(t) as unknown
      if (p !== null && typeof p === "object" && !Array.isArray(p)) {
        return p as Record<string, unknown>
      }
    } catch {
      return undefined
    }
    return undefined
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

/**
 * Merges GraphQL / REST `attributes` with `default` from `block.json` when a
 * value is `null` or `undefined` (WordPress may omit or null optional fields).
 */
export function applyAttributeDefaults<M extends BlockMeta>(
  meta: M,
  attributes: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const effectiveMeta = expandBlockCapabilities(meta)
  const out: Record<string, unknown> = { ...(attributes ?? {}) }
  for (const key of Object.keys(effectiveMeta.attributes)) {
    if (out[key] === undefined || out[key] === null) {
      const spec = effectiveMeta.attributes[key]
      if (Object.prototype.hasOwnProperty.call(spec, "default")) {
        out[key] = spec.default
      }
    }
  }
  for (const key of Object.keys(effectiveMeta.attributes)) {
    const spec = effectiveMeta.attributes[key]
    if (spec.type === "object" && typeof out[key] === "string") {
      const parsed = parseBlockObjectAttr(out[key])
      if (parsed !== undefined) {
        out[key] = parsed
      }
    }
  }
  return out
}

export type { BlockName } from "./registry"
export type { BlockDefinition } from "./types"
