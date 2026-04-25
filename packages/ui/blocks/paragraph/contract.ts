import block from "./block.json"
import type { AssertAssignable } from "../contract-types"

type AttributeNames = keyof typeof block.attributes
type StyleMapAttributeNames = keyof typeof block.customTailwind.styleMap

// 1. Every `customTailwind.styleMap.*` key must point at a real attribute.
type _StyleMapKeysAreAttributes = AssertAssignable<
  StyleMapAttributeNames,
  AttributeNames
>
