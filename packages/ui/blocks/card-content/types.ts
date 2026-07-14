import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardContentAttributes = InferAttributes<typeof blockMeta>
