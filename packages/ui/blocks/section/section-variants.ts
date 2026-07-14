import { cva } from "class-variance-authority"

export const sectionVariantTokens = {
  layout: {
    stack: "flex flex-col",
    row: "flex flex-row flex-wrap",
    grid: "grid",
  },
  justify: {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  },
  alignItems: {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  },
  gap: {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-8",
  },
  width: {
    contained: "mx-auto max-w-7xl",
    full: "max-w-none",
  },
  columns: {
    "1": "grid-cols-1",
    "2": "grid-cols-1 md:grid-cols-2",
    "3": "grid-cols-1 md:grid-cols-3",
    "4": "grid-cols-1 md:grid-cols-4",
    "5": "grid-cols-1 md:grid-cols-5",
    "6": "grid-cols-1 md:grid-cols-6",
  },
} as const

export const sectionVariants = cva("w-full min-w-0", {
  variants: sectionVariantTokens,
  defaultVariants: {
    layout: "stack",
    justify: "start",
    alignItems: "stretch",
    gap: "md",
    width: "full",
    columns: "2",
  },
})
