import type { ComponentType } from "react"

import {
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
  ButtonBlock,
  getButtonBlockClassName,
  buttonMeta,
  applyAttributeDefaults,
  type BlockMeta,
} from "@repo/ui/blocks"

type AttributeValue = string | number | boolean | unknown[] | Record<string, unknown>
type Attributes = Record<string, AttributeValue>

type CustomControl = {
  type: string
  bind: string
  label: string
  options?: Array<string | number>
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
  Component: ComponentType<Attributes & { className?: string }>
  getEditableClassName?: (
    attributes: Attributes,
    editable: EditableConfig,
  ) => string
}

type EditableConfig = {
  attribute: string
  tagName: string
  placeholder: string
  className?: string
}

const customBlocks: CustomBlockDefinition[] = [
  {
    meta: buttonMeta,
    Component: ButtonBlock as unknown as CustomBlockDefinition["Component"],
    getEditableClassName(attributes, editable) {
      return getButtonBlockClassName({
        variant: String(attributes.variant ?? "default"),
        size: String(attributes.size ?? "default"),
        className: editable.className,
      })
    },
  },
]

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
}: {
  control: CustomControl
  value: AttributeValue | undefined
  setAttribute: (name: string, value: AttributeValue) => void
}) {
  if (control.type === "select") {
    return (
      <SelectControl
        label={control.label}
        value={String(value ?? "")}
        options={controlOptions(control)}
        onChange={(next) => setAttribute(control.bind, next)}
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

  if (!editable || !meta.attributes[editable.attribute]?.richText) {
    return <Component {...attributes} />
  }

  const className =
    getEditableClassName?.(attributes, editable) ?? editable.className

  return (
    <div className={className}>
      <RichText
        tagName={editable.tagName}
        value={String(attributes[editable.attribute] ?? "")}
        allowedFormats={getAllowedRichTextFormats(meta)}
        placeholder={editable.placeholder}
        onChange={(nextValue) => setAttribute(editable.attribute, nextValue)}
      />
    </div>
  )
}

function registerCustomBlock(definition: CustomBlockDefinition) {
  const { meta } = definition
  const controls = meta.customControls?.inspector ?? []

  registerBlockType(meta.name, {
    ...meta,
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

customBlocks.forEach(registerCustomBlock)
