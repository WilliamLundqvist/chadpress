import type { BlockDefinition } from "../types"
import { Column } from "./Column"
import columnMeta from "./block.json"
import type { ColumnAttributes } from "./types"

export type { ColumnAttributes } from "./types"
export { Column }
export { default as columnMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof columnMeta, ColumnAttributes> = {
  Component: Column,
  meta: columnMeta,
}
