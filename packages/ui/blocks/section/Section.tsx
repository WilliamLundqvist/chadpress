import type { ReactNode } from "react"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { sectionVariants } from "./section-variants"
import type { SectionAttributes } from "./types"

const { className: wrapperClassName } = block.customTailwind
type SectionVariants = VariantProps<typeof sectionVariants>

export function Section({
  layout,
  justify,
  alignItems,
  gap,
  width,
  columns,
  children,
  className,
}: SectionAttributes & {
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      data-slot="section"
      className={cn(
        sectionVariants({
          layout: layout as SectionVariants["layout"],
          justify: justify as SectionVariants["justify"],
          alignItems: alignItems as SectionVariants["alignItems"],
          gap: gap as SectionVariants["gap"],
          width: width as SectionVariants["width"],
          columns: columns as SectionVariants["columns"],
        }),
        wrapperClassName || undefined,
        className,
      )}
    >
      {children}
    </section>
  )
}
