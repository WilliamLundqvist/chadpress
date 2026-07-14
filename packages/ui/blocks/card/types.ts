import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardAttributes = InferAttributes<typeof blockMeta>
