import type { InferAttributes } from "../types"
import type blockMeta from "./block.json"

export type ColumnsAttributes = InferAttributes<typeof blockMeta>
