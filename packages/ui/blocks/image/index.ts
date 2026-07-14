import type { BlockDefinition } from "../types"
import { ImageBlock } from "./ImageBlock"
import imageMeta from "./block.json"
import type { ImageAttributes } from "./types"

export type { ImageAttributes } from "./types"
export { ImageBlock, getImageObjectFitVariant } from "./ImageBlock"
export { default as imageMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof imageMeta, ImageAttributes> =
  {
    Component: ImageBlock,
    meta: imageMeta,
  }
