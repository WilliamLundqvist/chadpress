import type { BlockDefinition } from "../types"
import { Text } from "./Text"
import textMeta from "./block.json"
import type { TextAttributes } from "./types"

export type { TextAttributes } from "./types"
export { Text }
export { default as textMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof textMeta, TextAttributes> = {
  Component: Text,
  meta: textMeta,
}
