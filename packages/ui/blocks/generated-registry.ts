import { blockDefinition as buttonDefinition } from "./button"
import { blockDefinition as groupDefinition } from "./group"
import { blockDefinition as headingDefinition } from "./heading"
import { blockDefinition as paragraphDefinition } from "./paragraph"

export const blockRegistry = {
  "chadpress/button": buttonDefinition,
  "chadpress/group": groupDefinition,
  "core/heading": headingDefinition,
  "core/paragraph": paragraphDefinition,
} as const

export type BlockName = keyof typeof blockRegistry
