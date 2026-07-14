import { cva } from "class-variance-authority"

export const imageVariants = cva("h-auto w-full max-w-full", {
  variants: {
    objectFit: {
      cover: "object-cover",
      contain: "object-contain",
      fill: "object-fill",
    },
  },
  defaultVariants: {
    objectFit: "cover",
  },
})
