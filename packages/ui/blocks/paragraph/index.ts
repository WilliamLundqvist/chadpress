import type { BlockDefinition } from "../types"
import { Paragraph } from "./Paragraph"
import paragraphMeta from "./block.json"
import type { ParagraphAttributes } from "./types"

export type { ParagraphAttributes } from "./types"
export { Paragraph }
export { default as paragraphMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof paragraphMeta, ParagraphAttributes> = {
  Component: Paragraph,
  meta: paragraphMeta,
}
