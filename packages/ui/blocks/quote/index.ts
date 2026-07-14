import type { BlockDefinition } from "../types"
import { Quote } from "./Quote"
import quoteMeta from "./block.json"
import type { QuoteAttributes } from "./types"

export type { QuoteAttributes } from "./types"
export { Quote }
export { default as quoteMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof quoteMeta, QuoteAttributes> = {
  Component: Quote,
  meta: quoteMeta,
}
