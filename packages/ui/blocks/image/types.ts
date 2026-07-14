import blockMeta from "./block.json"
import type { InferAttributes } from "../types"

export type ImageAttributes = InferAttributes<typeof blockMeta>
