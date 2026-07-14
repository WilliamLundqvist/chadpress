import type { InferAttributes } from "../types"
import blockMeta from "./block.json"

export type HeadingAttributes = InferAttributes<typeof blockMeta> & {
  align: string
}
