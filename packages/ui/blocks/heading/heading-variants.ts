import { cva } from "class-variance-authority"

/**
 * shadcn/ui does not publish a `typography` item in the component registry. Running
 * `npx shadcn add typography` will 404 (e.g. for base-nova) by design — see:
 * https://ui.shadcn.com/docs/components/typography — “We do not ship any typography
 * styles by default” (the page is examples using utility classes).
 *
 * These variants are the h1–h6 scale from that documentation, composed with cva
 * the same way other shadcn components do (e.g. button). Align is logical
 * (text-start / text-center / text-end) for RTL.
 */
export const headingVariantTokens = {
  variant: {
    h1: "text-4xl font-extrabold tracking-tight text-balance lg:text-5xl",
    h2: "text-3xl font-semibold tracking-tight",
    h3: "text-2xl font-semibold tracking-tight",
    h4: "text-xl font-semibold tracking-tight",
    h5: "text-lg font-semibold tracking-tight",
    h6: "text-base font-semibold tracking-tight",
  },
  align: {
    start: "text-start",
    center: "text-center",
    end: "text-end",
  },
} as const

export const headingVariants = cva("scroll-m-20", {
  variants: {
    variant: headingVariantTokens.variant,
    align: headingVariantTokens.align,
  },
  defaultVariants: {
    variant: "h2",
    align: "start",
  },
})
