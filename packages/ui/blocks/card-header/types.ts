import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardHeaderAttributes = InferAttributes<typeof blockMeta>
