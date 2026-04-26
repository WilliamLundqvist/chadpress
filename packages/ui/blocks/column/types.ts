import type { InferAttributes } from "../types"
import type blockMeta from "./block.json"

export type ColumnAttributes = InferAttributes<typeof blockMeta>
