import type { BlockDefinition } from "../types"
import { CardHeaderBlock } from "./CardHeaderBlock"
import cardHeaderMeta from "./block.json"
import type { CardHeaderAttributes } from "./types"

export type { CardHeaderAttributes } from "./types"
export { CardHeaderBlock } from "./CardHeaderBlock"
export { default as cardHeaderMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof cardHeaderMeta,
  CardHeaderAttributes
> = {
  Component: CardHeaderBlock,
  meta: cardHeaderMeta,
}
