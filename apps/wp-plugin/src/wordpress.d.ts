declare module "@wordpress/block-editor" {
  import type * as React from "react"

  export const InspectorControls: React.ComponentType<{
    children?: React.ReactNode
  }>

  export const RichText: React.ComponentType<{
    tagName: string
    value: string
    allowedFormats?: string[]
    placeholder?: string
    className?: string
    onChange: (value: string) => void
  }>

  export function useBlockProps(
    props?: Record<string, unknown>,
  ): Record<string, unknown>

  export namespace useBlockProps {
    function save(props?: Record<string, unknown>): Record<string, unknown>
  }
}
