import type { ComponentType, ReactNode } from "react"

type WpDefaultType<D> = D extends string
  ? string
  : D extends number
    ? number
    : D extends boolean
      ? boolean
      : D extends unknown[]
        ? unknown[]
        : D extends Record<string, unknown>
          ? Record<string, unknown>
          : unknown

type WpType<T extends string, D = unknown> = T extends "string"
  ? string
  : T extends "number" | "integer"
    ? number
    : T extends "boolean"
      ? boolean
      : T extends "array"
        ? unknown[]
        : T extends "object"
          ? Record<string, unknown>
        : string extends T
          ? WpDefaultType<D>
          : never

/**
 * Infers a props object from `block.json` `attributes` — single source of truth for block props.
 */
export type InferAttributes<
  M extends { attributes: Record<string, { type: string; default?: unknown }> },
> = {
  [K in keyof M["attributes"]]: WpType<
    M["attributes"][K]["type"],
    M["attributes"][K] extends { default: infer D } ? D : unknown
  >
}

export interface BlockDefinition<Meta = unknown, Attrs = unknown> {
  Component: ComponentType<
    Attrs & {
      className?: string
      children?: ReactNode
      slots?: Record<string, ReactNode>
    }
  >
  meta: Meta
}
