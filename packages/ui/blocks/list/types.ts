import blockMeta from "./block.json"
import type { InferAttributes } from "../types"

export type ListAttributes = InferAttributes<typeof blockMeta>
