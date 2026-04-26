import { blockDefinition as buttonDefinition } from "./button"
import { blockDefinition as columnDefinition } from "./column"
import { blockDefinition as columnsDefinition } from "./columns"
import { blockDefinition as groupDefinition } from "./group"
import { blockDefinition as headingDefinition } from "./heading"
import { blockDefinition as paragraphDefinition } from "./paragraph"

export const blockRegistry = {
  "chadpress/button": buttonDefinition,
  "core/column": columnDefinition,
  "core/columns": columnsDefinition,
  "core/group": groupDefinition,
  "core/heading": headingDefinition,
  "core/paragraph": paragraphDefinition,
} as const

export type BlockName = keyof typeof blockRegistry
