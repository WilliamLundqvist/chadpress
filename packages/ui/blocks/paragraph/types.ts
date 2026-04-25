import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type ParagraphAttributes = InferAttributes<typeof blockMeta>
