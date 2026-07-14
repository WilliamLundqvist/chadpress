import type { BlockDefinition } from "../types"
import { CardDescriptionBlock } from "./CardDescriptionBlock"
import cardDescriptionMeta from "./block.json"
import type { CardDescriptionAttributes } from "./types"

export type { CardDescriptionAttributes } from "./types"
export { CardDescriptionBlock } from "./CardDescriptionBlock"
export { default as cardDescriptionMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof cardDescriptionMeta,
  CardDescriptionAttributes
> = {
  Component: CardDescriptionBlock,
  meta: cardDescriptionMeta,
}
