import type { BlockDefinition } from "../types"
import { CardContentBlock } from "./CardContentBlock"
import cardContentMeta from "./block.json"
import type { CardContentAttributes } from "./types"

export type { CardContentAttributes } from "./types"
export { CardContentBlock } from "./CardContentBlock"
export { default as cardContentMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof cardContentMeta,
  CardContentAttributes
> = {
  Component: CardContentBlock,
  meta: cardContentMeta,
}
