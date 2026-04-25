import type { BlockDefinition } from "../types"
import { ButtonBlock, getButtonBlockClassName } from "./Button"
import buttonMeta from "./block.json"
import type { ButtonAttributes } from "./types"

export type { ButtonAttributes } from "./types"
export {
  ButtonBlock,
  getButtonBlockClassName,
  getButtonBlockSize,
  getButtonBlockVariant,
  getButtonRel,
} from "./Button"
export { default as buttonMeta } from "./block.json"

export const blockDefinition: BlockDefinition<typeof buttonMeta, ButtonAttributes> = {
  Component: ButtonBlock,
  meta: buttonMeta,
  getEditableClassName(attributes, className) {
    return getButtonBlockClassName({
      variant: String(attributes.variant ?? "default"),
      size: String(attributes.size ?? "default"),
      className,
    })
  },
}
