import type { ComponentType, ReactNode } from "react"

import {
  InnerBlocks,
  InspectorControls,
  RichText,
  useBlockProps,
} from "@wordpress/block-editor"
import { registerBlockType } from "@wordpress/blocks"
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components"

import {
  applyAttributeDefaults,
  blockRegistry,
  type BlockMeta,
} from "@repo/ui/blocks"

type AttributeValue = unknown
type Attributes = Record<string, unknown>

type CustomControl = {
  type: string
  bind: string
  label: string
  options?: Array<string | number | boolean>
}

type CustomBlockMeta = BlockMeta & {
  title: string
  category?: string
  icon?: string
  customControls?: {
    toolbar?: CustomControl[]
    inspector?: CustomControl[]
  }
  customEditor?: {
    source: string
    editable?: EditableConfig
    allowedRichText?: string[]
    disabledSupports?: string[]
  }
}

type CustomBlockDefinition = {
  meta: CustomBlockMeta
  Component: ComponentType<Attributes & { className?: string; children?: ReactNode }>
  getEditableClassName?: (
    attributes: Record<string, unknown>,
    className?: string,
  ) => string
}

type EditableConfig = {
  attribute: string
  tagName: string
  placeholder: string
  className?: string
}

const richTextFormatMap = {
  bold: "core/bold",
  italic: "core/italic",
  link: "core/link",
} as const

function normalizeAttributes(meta: BlockMeta, attributes: Attributes | undefined) {
  return applyAttributeDefaults(meta, attributes) as Attributes
}

function controlOptions(control: CustomControl) {
  return (control.options ?? []).map((option) => ({
    label: String(option),
    value: String(option),
  }))
}

function CustomControlField({
  control,
  value,
  setAttribute,
  attributeType,
}: {
  control: CustomControl
  value: AttributeValue | undefined
  setAttribute: (name: string, value: AttributeValue) => void
  attributeType?: string
}) {
  if (control.type === "select") {
    return (
      <SelectControl
        label={control.label}
        value={String(value ?? "")}
        options={controlOptions(control)}
        onChange={(next) => {
          if (attributeType === "number" || attributeType === "integer") {
            const n = Number(next)
            setAttribute(control.bind, Number.isFinite(n) ? n : next)
            return
          }
          setAttribute(control.bind, next)
        }}
      />
    )
  }

  if (control.type === "toggle") {
    return (
      <ToggleControl
        label={control.label}
        checked={Boolean(value)}
        onChange={(next) => setAttribute(control.bind, next)}
      />
    )
  }

  if (control.type === "text") {
    return (
      <TextControl
        label={control.label}
        value={String(value ?? "")}
        onChange={(next) => setAttribute(control.bind, next)}
      />
    )
  }

  return null
}

function getAllowedRichTextFormats(meta: CustomBlockMeta): string[] {
  return (meta.customEditor?.allowedRichText ?? []).reduce<string[]>(
    (formats, format) => {
      const wpFormat = richTextFormatMap[format as keyof typeof richTextFormatMap]
      if (wpFormat) {
        formats.push(wpFormat)
      }
      return formats
    },
    [],
  )
}

function isCustomBlockDefinition(
  definition: unknown,
): definition is CustomBlockDefinition {
  const meta = (definition as { meta?: CustomBlockMeta }).meta
  return meta?.customEditor?.source === "custom"
}

function getWordPressSupports(meta: CustomBlockMeta) {
  const { innerBlocks, allowedBlocks, template, ...supports } = meta.supports ?? {}

  if (Object.keys(supports).length === 0) {
    return undefined
  }

  return supports
}

function getInnerBlocksConfig(meta: CustomBlockMeta) {
  if (!meta.supports?.innerBlocks) {
    return undefined
  }

  const { allowedBlocks, template } = meta.supports
  return {
    // Empty `[]` in block.json means "no restriction" (all blocks), not "none".
    allowedBlocks: allowedBlocks?.length ? allowedBlocks : undefined,
    template,
  }
}

function GenericBlockEdit({
  definition,
  attributes,
  setAttribute,
}: {
  definition: CustomBlockDefinition
  attributes: Attributes
  setAttribute: (name: string, value: AttributeValue) => void
}) {
  const { meta, Component, getEditableClassName } = definition
  const editable = meta.customEditor?.editable
  const innerBlocksConfig = getInnerBlocksConfig(meta)
  const innerBlocks = innerBlocksConfig ? (
    <InnerBlocks
      allowedBlocks={innerBlocksConfig.allowedBlocks}
      template={innerBlocksConfig.template}
    />
  ) : null

  if (!editable || !meta.attributes[editable.attribute]?.richText) {
    return <Component {...attributes}>{innerBlocks}</Component>
  }

  const className =
    getEditableClassName?.(attributes, editable.className) ?? editable.className

  return (
    <>
      <div className={className}>
        <RichText
          tagName={editable.tagName}
          value={String(attributes[editable.attribute] ?? "")}
          allowedFormats={getAllowedRichTextFormats(meta)}
          placeholder={editable.placeholder}
          onChange={(nextValue) => setAttribute(editable.attribute, nextValue)}
        />
      </div>
      {innerBlocks}
    </>
  )
}

function registerCustomBlock(definition: CustomBlockDefinition) {
  const { meta } = definition
  const controls = meta.customControls?.inspector ?? []
  const { supports: ignoredSupports, ...blockSettings } = meta
  void ignoredSupports

  registerBlockType(meta.name, {
    ...blockSettings,
    supports: getWordPressSupports(meta),
    icon: meta.icon as never,
    edit({ attributes, setAttributes }) {
      const normalized = normalizeAttributes(meta, attributes as Attributes)
      const blockProps = useBlockProps()
      const setAttribute = (name: string, value: AttributeValue) => {
        setAttributes({ [name]: value })
      }

      return (
        <>
          {controls.length > 0 && (
            <InspectorControls>
              <PanelBody title={`${meta.title} settings`}>
                {controls.map((control) => (
                  <CustomControlField
                    key={`${meta.name}-${control.bind}`}
                    control={control}
                    value={normalized[control.bind]}
                    setAttribute={setAttribute}
                    attributeType={meta.attributes?.[control.bind]?.type}
                  />
                ))}
              </PanelBody>
            </InspectorControls>
          )}
          <div
            {...blockProps}
            onClick={(event) => event.preventDefault()}
          >
            <GenericBlockEdit
              definition={definition}
              attributes={normalized}
              setAttribute={setAttribute}
            />
          </div>
        </>
      )
    },
    save() {
      return null
    },
  })
}

const customBlocks = (Object.values(blockRegistry) as unknown[]).filter(
  isCustomBlockDefinition,
)

customBlocks.forEach(registerCustomBlock)
