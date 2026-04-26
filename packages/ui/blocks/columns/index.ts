import type { BlockDefinition } from "../types"
import { Columns } from "./Columns"
import columnsMeta from "./block.json"
import type { ColumnsAttributes } from "./types"

export type { ColumnsAttributes } from "./types"
export { Columns }
export { default as columnsMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof columnsMeta, ColumnsAttributes> = {
  Component: Columns,
  meta: columnsMeta,
}
