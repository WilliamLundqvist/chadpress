import type { InferAttributes } from "../types"
import type blockMeta from "./block.json"

export type QuoteAttributes = InferAttributes<typeof blockMeta>
