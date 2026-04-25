import { Heading } from "./Heading"
import type { BlockDefinition } from "../types"
import headingMeta from "./block.json"
import type { HeadingAttributes } from "./types"

export type { HeadingAttributes } from "./types"
export { Heading }
export { default as headingMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof headingMeta, HeadingAttributes> = {
  Component: Heading,
  meta: headingMeta,
}
