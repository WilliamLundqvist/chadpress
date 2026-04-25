import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type GroupAttributes = InferAttributes<typeof blockMeta>
