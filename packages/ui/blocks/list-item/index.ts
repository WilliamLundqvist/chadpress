import type { BlockDefinition } from "../types"
import { ListItemBlock } from "./ListItemBlock"
import listItemMeta from "./block.json"
import type { ListItemAttributes } from "./types"

export type { ListItemAttributes } from "./types"
export { ListItemBlock } from "./ListItemBlock"
export { default as listItemMeta } from "./block.json"

export const blockDefinition: BlockDefinition<
  typeof listItemMeta,
  ListItemAttributes
> = {
  Component: ListItemBlock,
  meta: listItemMeta,
}
