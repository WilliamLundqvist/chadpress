import type { BlockDefinition } from "../types"
import { CardBlock } from "./CardBlock"
import cardMeta from "./block.json"
import type { CardAttributes } from "./types"

export type { CardAttributes } from "./types"
export { CardBlock } from "./CardBlock"
export { default as cardMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof cardMeta, CardAttributes> = {
  Component: CardBlock,
  meta: cardMeta,
}
