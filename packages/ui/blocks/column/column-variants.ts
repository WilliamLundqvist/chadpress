import { cva } from "class-variance-authority"

export const columnVariants = cva("flex min-h-0 min-w-0 flex-col", {
  variants: {
    width: {
      full: "w-full basis-full",
      half: "w-full md:basis-1/2",
      third: "w-full md:basis-1/3",
      "two-thirds": "w-full md:basis-2/3",
      quarter: "w-full md:basis-1/4",
      "three-quarters": "w-full md:basis-3/4",
    },
  },
  defaultVariants: {
    width: "full",
  },
})
