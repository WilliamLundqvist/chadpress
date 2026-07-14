import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type CardFooterAttributes = InferAttributes<typeof blockMeta>
