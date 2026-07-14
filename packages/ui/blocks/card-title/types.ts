import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardTitleAttributes = InferAttributes<typeof blockMeta>
