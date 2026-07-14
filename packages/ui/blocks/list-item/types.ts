import blockMeta from "./block.json"
import type { InferAttributes } from "../types"

export type ListItemAttributes = InferAttributes<typeof blockMeta>
