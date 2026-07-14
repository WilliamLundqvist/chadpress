import type { BlockDefinition } from "../types"
import { ButtonBlock } from "./Button"
import buttonMeta from "./block.json"
import type { ButtonAttributes } from "./types"

export type { ButtonAttributes } from "./types"
export {
  ButtonBlock,
  getButtonBlockSize,
  getButtonBlockVariant,
  getButtonRel,
} from "./Button"
export { default as buttonMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof buttonMeta, ButtonAttributes> = {
  Component: ButtonBlock,
  meta: buttonMeta,
}
