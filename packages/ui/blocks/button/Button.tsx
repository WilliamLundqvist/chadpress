import type { VariantProps } from "class-variance-authority"

import {
  Button as ShadcnButton,
  buttonVariants,
} from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import type { ButtonAttributes } from "./types"

const { styleMap, className: wrapperClassName } = block.customTailwind

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>

export function getButtonRel(openInNewTab: boolean) {
  return openInNewTab ? "noreferrer noopener" : undefined
}

export function getButtonBlockVariant(variant: string): ButtonVariant {
  return (styleMap.variant[
    variant as keyof typeof styleMap.variant
  ] as ButtonVariant | undefined) ?? "default"
}

export function getButtonBlockSize(size: string): ButtonSize {
  return (styleMap.size[
    size as keyof typeof styleMap.size
  ] as ButtonSize | undefined) ?? "default"
}

export function getButtonBlockClassName({
  variant,
  size,
  className,
}: {
  variant: string
  size: string
  className?: string
}) {
  return cn(
    buttonVariants({
      variant: getButtonBlockVariant(variant),
      size: getButtonBlockSize(size),
    }),
    wrapperClassName || undefined,
    className,
  )
}

function getFirstHref(html: string) {
  return /<a\b[^>]*\bhref=(["'])(.*?)\1/i.exec(html)?.[2] ?? ""
}

function stripAnchorTags(html: string) {
  return html.replace(/<\/?a\b[^>]*>/gi, "")
}

export function ButtonBlock({
  label,
  url,
  variant,
  size,
  openInNewTab,
  className,
}: ButtonAttributes & { className?: string }) {
  const href = url.trim() || getFirstHref(label)
  const labelHtml = href ? stripAnchorTags(label) : label

  return (
    <ShadcnButton
      variant={getButtonBlockVariant(variant)}
      size={getButtonBlockSize(size)}
      className={cn(wrapperClassName || undefined, className)}
      render={
        href
          ? (
              <a
                href={href}
                target={openInNewTab ? "_blank" : undefined}
                rel={getButtonRel(openInNewTab)}
              />
            )
          : undefined
      }
      dangerouslySetInnerHTML={{ __html: labelHtml }}
    />
  )
}
