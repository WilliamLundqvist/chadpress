import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardDescriptionAttributes = InferAttributes<typeof blockMeta>
