import type { BlockDefinition } from "../types"
import { ListBlock } from "./ListBlock"
import blockMeta from "./block.json"
import type { ListAttributes } from "./types"

export type { ListAttributes } from "./types"
export { ListBlock } from "./ListBlock"
export { default as listMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof blockMeta, ListAttributes> = {
  Component: ListBlock,
  meta: blockMeta,
}
