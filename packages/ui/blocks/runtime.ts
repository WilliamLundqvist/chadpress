import { blockRegistry, type BlockName } from "./registry"

/** Minimal `block.json` shape needed for defaulting and field lists */
export type BlockMeta = {
  name: string
  attributes: Record<string, { type: string; default?: unknown; richText?: boolean }>
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

export function getBlockAttributeKeys<M extends { attributes: Record<string, unknown> }>(
  meta: M,
): string[] {
  return Object.keys(meta.attributes)
}

/**
 * Merges GraphQL / REST `attributes` with `default` from `block.json` when a
 * value is `null` or `undefined` (WordPress may omit or null optional fields).
 */
export function applyAttributeDefaults<M extends BlockMeta>(
  meta: M,
  attributes: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(attributes ?? {}) }
  for (const key of Object.keys(meta.attributes)) {
    if (out[key] === undefined || out[key] === null) {
      const spec = meta.attributes[key] as { default?: unknown }
      if (Object.prototype.hasOwnProperty.call(spec, "default")) {
        out[key] = spec.default
      }
    }
  }
  return out
}

export type { BlockName } from "./registry"
export type { BlockDefinition } from "./types"
