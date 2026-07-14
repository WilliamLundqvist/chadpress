import { cva } from "class-variance-authority"

export const listVariants = cva("my-4 space-y-1 pl-6", {
  variants: {
    ordered: {
      true: "list-decimal",
      false: "list-disc",
    },
  },
  defaultVariants: {
    ordered: false,
  },
})
