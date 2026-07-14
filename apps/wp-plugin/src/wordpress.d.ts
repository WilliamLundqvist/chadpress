declare module "@wordpress/block-editor" {
  import type * as React from "react"

  export const AlignmentToolbar: React.ComponentType<{
    value?: string
    onChange: (value?: string) => void
  }>

  export const BlockControls: React.ComponentType<{
    children?: React.ReactNode
  }>

  export const HeadingLevelDropdown: React.ComponentType<{
    value: number
    options?: number[]
    onChange: (value: number) => void
  }>

  export const InspectorControls: React.ComponentType<{
    children?: React.ReactNode
  }>

  export const InnerBlocks: React.ComponentType<{
    allowedBlocks?: string[]
    template?: unknown[]
  }>

  export function useInnerBlocksProps(
    props?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Record<string, unknown> & { children?: React.ReactNode }

  export const MediaPlaceholder: React.ComponentType<Record<string, unknown>>
  export const MediaUpload: React.ComponentType<Record<string, unknown>>
  export const MediaUploadCheck: React.ComponentType<{
    children?: React.ReactNode
  }>

  export const RichText: React.ComponentType<{
    tagName: string
    value: string
    allowedFormats?: string[]
    placeholder?: string
    className?: string
    ref?: React.Ref<HTMLElement>
    onChange: (value: string) => void
    onSplit?: (value: string, isOriginal: boolean) => unknown
    onMerge?: (forward: boolean) => void
    onReplace?: (
      blocks: unknown[],
      indexToSelect?: number,
      initialPosition?: number,
    ) => void
  }>

  export const URLInput: React.ComponentType<{
    label?: string
    value: string
    onChange: (value: string) => void
  }>

  export const store: any

  export function useBlockProps(
    props?: Record<string, unknown>,
  ): Record<string, unknown>

  export namespace useBlockProps {
    function save(props?: Record<string, unknown>): Record<string, unknown>
  }
}
