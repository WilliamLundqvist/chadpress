import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type ButtonAttributes = InferAttributes<typeof blockMeta>
