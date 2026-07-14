import type { BlockDefinition } from "../types"
import { Section } from "./Section"
import sectionMeta from "./block.json"
import type { SectionAttributes } from "./types"

export type { SectionAttributes } from "./types"
export { Section }
export { default as sectionMeta } from "./block.json"
export { sectionVariants } from "./section-variants"

export const blockDefinition: BlockDefinition<typeof sectionMeta, SectionAttributes> = {
  Component: Section,
  meta: sectionMeta,
}
