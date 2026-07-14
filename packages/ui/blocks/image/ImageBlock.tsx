import type { ElementType, ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import block from "./block.json"
import { imageVariants } from "./image-variants"
import type { ImageAttributes } from "./types"

const { styleMap, className: wrapperClassName } = block.customTailwind

type ObjectFitKey = keyof typeof styleMap.objectFit

function RichContent({
  slot,
  html,
  as: Tag,
  className,
}: {
  slot: ReactNode | undefined
  html: string
  as: ElementType
  className?: string
}) {
  if (slot !== undefined) {
    return <Tag className={className}>{slot}</Tag>
  }

  if (!html.trim()) {
    return null
  }

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function getImageObjectFitVariant(objectFit: string) {
  const token = styleMap.objectFit[objectFit as ObjectFitKey]
  return (token ?? "cover") as "cover" | "contain" | "fill"
}

export function ImageBlock({
  url,
  alt,
  mediaWidth,
  mediaHeight,
  caption,
  objectFit,
  linkUrl,
  className,
  slots,
}: ImageAttributes & {
  className?: string
  slots?: Record<string, ReactNode>
}) {
  if (!url.trim()) {
    return null
  }

  const fitVariant = getImageObjectFitVariant(objectFit)
  const figureClassName = cn(wrapperClassName || undefined, className)
  const imageClassName = imageVariants({ objectFit: fitVariant })
  const trimmedLink = linkUrl.trim()
  const image = (
    <img
      src={url}
      alt={alt}
      width={mediaWidth > 0 ? mediaWidth : undefined}
      height={mediaHeight > 0 ? mediaHeight : undefined}
      className={imageClassName}
      loading="lazy"
      decoding="async"
    />
  )

  return (
    <figure data-slot="image" className={figureClassName}>
      {trimmedLink ? (
        <a href={trimmedLink} className="block">
          {image}
        </a>
      ) : (
        image
      )}
      <RichContent
        slot={slots?.caption}
        html={caption}
        as="figcaption"
        className="mt-2 text-sm text-muted-foreground"
      />
    </figure>
  )
}
