import type { ReactNode } from "react"
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
  slots,
}: ButtonAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  const href = url.trim() || getFirstHref(label)
  const labelHtml = href ? stripAnchorTags(label) : label
  const labelSlot = slots?.label
  const buttonVariant = getButtonBlockVariant(variant)
  const buttonSize = getButtonBlockSize(size)
  const sharedClassName = cn(wrapperClassName || undefined, className)
  const anchorClassName = cn(
    buttonVariants({ variant: buttonVariant, size: buttonSize }),
    sharedClassName,
  )

  if (href) {
    return (
      <a
        data-slot="button"
        className={anchorClassName}
        href={href}
        target={openInNewTab ? "_blank" : undefined}
        rel={getButtonRel(openInNewTab)}
      >
        {labelSlot ?? <span dangerouslySetInnerHTML={{ __html: labelHtml }} />}
      </a>
    )
  }

  if (labelSlot !== undefined) {
    return (
      <ShadcnButton variant={buttonVariant} size={buttonSize} className={sharedClassName}>
        {labelSlot}
      </ShadcnButton>
    )
  }

  return (
    <ShadcnButton
      variant={buttonVariant}
      size={buttonSize}
      className={sharedClassName}
      dangerouslySetInnerHTML={{ __html: labelHtml }}
    />
  )
}
