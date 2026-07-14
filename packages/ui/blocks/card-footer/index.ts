import type { BlockDefinition } from "../types"
import { CardFooterBlock } from "./CardFooterBlock"
import cardFooterMeta from "./block.json"
import type { CardFooterAttributes } from "./types"

export type { CardFooterAttributes } from "./types"
export { CardFooterBlock } from "./CardFooterBlock"
export { default as cardFooterMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof cardFooterMeta,
  CardFooterAttributes
> = {
  Component: CardFooterBlock,
  meta: cardFooterMeta,
}
