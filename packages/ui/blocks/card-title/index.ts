import type { BlockDefinition } from "../types"
import { CardTitleBlock } from "./CardTitleBlock"
import cardTitleMeta from "./block.json"
import type { CardTitleAttributes } from "./types"

export type { CardTitleAttributes } from "./types"
export { CardTitleBlock } from "./CardTitleBlock"
export { default as cardTitleMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof cardTitleMeta,
  CardTitleAttributes
> = {
  Component: CardTitleBlock,
  meta: cardTitleMeta,
}
