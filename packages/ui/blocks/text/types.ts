import type { InferAttributes } from "../types"
import type blockMeta from "./block.json"

type ExplicitTextAttributes = InferAttributes<typeof blockMeta>

export type TextAttributes = ExplicitTextAttributes & {
  align: string
}
