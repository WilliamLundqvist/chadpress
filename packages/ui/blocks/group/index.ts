import type { BlockDefinition } from "../types"
import { Group } from "./Group"
import groupMeta from "./block.json"
import type { GroupAttributes } from "./types"

export type { GroupAttributes } from "./types"
export { Group }
export { default as groupMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof groupMeta, GroupAttributes> = {
  Component: Group,
  meta: groupMeta,
}
