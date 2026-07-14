import { cva } from "class-variance-authority"

export const columnsVariants = cva("flex w-full min-w-0 gap-4", {
  variants: {
    stackOnMobile: {
      true: "flex-col md:flex-row",
      false: "flex-row",
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
  },
  defaultVariants: {
    stackOnMobile: true,
    alignItems: "stretch",
    gap: "md",
  },
})
