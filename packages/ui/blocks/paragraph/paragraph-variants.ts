import { cva } from "class-variance-authority";

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
export const paragraphVariantTokens = {
  align: {
    start: "text-start",
    center: "text-center",
    end: "text-end",
  },
} as const;

export const paragraphVariants = cva("scroll-m-20", {
  variants: paragraphVariantTokens,
  defaultVariants: {
    align: "start",
  } as const,
});
