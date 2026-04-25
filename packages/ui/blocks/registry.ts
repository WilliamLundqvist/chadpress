import { ButtonBlock, buttonMeta, type ButtonAttributes } from "./button"
import { Heading, headingMeta, type HeadingAttributes } from "./heading"
import type { BlockDefinition } from "./types"

const chadpressButton: BlockDefinition<typeof buttonMeta, ButtonAttributes> = {
  Component: ButtonBlock,
  meta: buttonMeta,
}

const coreHeading: BlockDefinition<typeof headingMeta, HeadingAttributes> = {
  Component: Heading,
  meta: headingMeta,
}

export const blockRegistry = {
  "core/heading": coreHeading,
  "chadpress/button": chadpressButton,
} as const

export type BlockName = keyof typeof blockRegistry
