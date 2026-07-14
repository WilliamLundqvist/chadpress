import type { ComponentType, ReactNode } from "react";

import {
  AlignmentToolbar,
  BlockControls,
  HeadingLevelDropdown,
  InnerBlocks,
  InspectorControls,
  RichText,
  URLInput,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  createBlock,
  registerBlockType,
  setDefaultBlockName,
} from "@wordpress/blocks";
import {
  Dropdown,
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
  ToolbarButton,
  ToolbarDropdownMenu,
  ToolbarGroup,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";

import {
  applyAttributeDefaults,
  blockRegistry,
  expandBlockCapabilities,
  getCapabilityClassName,
  type BlockAttributeSpec,
  type BlockControl,
  type BlockMeta,
} from "@repo/ui/blocks";

type AttributeValue = unknown;
type Attributes = Record<string, unknown>;
type SetAttribute = (name: string, value: AttributeValue) => void;

type CustomBlockMeta = BlockMeta & {
  title: string;
  category?: string;
  icon?: string;
  customControls?: {
    toolbar?: readonly BlockControl[];
    inspector?: readonly BlockControl[];
  };
  customEditor?: {
    source: string;
    allowedRichText?: readonly string[];
    splitting?: boolean;
  };
};

type EffectiveBlockMeta = Omit<
  CustomBlockMeta,
  "attributes" | "customControls"
> & {
  attributes: Record<string, BlockAttributeSpec>;
  customControls: {
    toolbar: BlockControl[];
    inspector: BlockControl[];
  };
};

type CustomBlockDefinition = {
  meta: CustomBlockMeta;
  Component: ComponentType<
    Attributes & {
      className?: string;
      children?: ReactNode;
      slots?: Record<string, ReactNode>;
    }
  >;
};

type BlockEditorActions = {
  mergeBlocks: (firstClientId: string, secondClientId: string) => void;
  replaceBlocks: (
    clientId: string,
    blocks: unknown[],
    indexToSelect?: number,
    initialPosition?: number,
  ) => void;
};

type BlockEditorSelectors = {
  getNextBlockClientId: (clientId: string) => string | null;
  getPreviousBlockClientId: (clientId: string) => string | null;
};

const richTextFormatMap = {
  bold: "core/bold",
  italic: "core/italic",
  link: "core/link",
} as const;

const InnerBlocksContent = (
  InnerBlocks as typeof InnerBlocks & { Content: ComponentType }
).Content;

function normalizeMeta(meta: CustomBlockMeta): EffectiveBlockMeta {
  return expandBlockCapabilities(meta) as EffectiveBlockMeta;
}

function normalizeAttributes(
  meta: CustomBlockMeta,
  attributes: Attributes | undefined,
) {
  return applyAttributeDefaults(meta, attributes) as Attributes;
}

function coerceControlValue(value: string, attributeType?: string) {
  if (attributeType === "number" || attributeType === "integer") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : value;
  }
  return value;
}

function controlOptions(
  control: BlockControl,
  fallback: readonly (string | number | boolean)[] = [],
) {
  return (control.options ?? fallback).map((option) => ({
    label: String(option),
    value: String(option),
  }));
}

function InspectorControlField({
  control,
  value,
  setAttribute,
  attributeType,
}: {
  control: BlockControl;
  value: AttributeValue | undefined;
  setAttribute: SetAttribute;
  attributeType?: string;
}) {
  switch (control.type) {
    case "select":
      return (
        <SelectControl
          label={control.label}
          value={String(value ?? "")}
          options={controlOptions(control)}
          onChange={(next) =>
            setAttribute(
              control.bind,
              coerceControlValue(next, attributeType),
            )
          }
        />
      );
    case "toggle":
      return (
        <ToggleControl
          label={control.label}
          checked={Boolean(value)}
          onChange={(next) => setAttribute(control.bind, next)}
        />
      );
    case "alignment":
      return (
        <SelectControl
          label={control.label}
          value={String(value ?? "left")}
          options={controlOptions(control, ["left", "center", "right"])}
          onChange={(next) => setAttribute(control.bind, next)}
        />
      );
    case "headingLevel":
      return (
        <SelectControl
          label={control.label}
          value={String(value ?? 2)}
          options={controlOptions(control, [1, 2, 3, 4, 5, 6])}
          onChange={(next) => setAttribute(control.bind, Number(next))}
        />
      );
    case "link":
      return (
        <URLInput
          label={control.label}
          value={String(value ?? "")}
          onChange={(next) => setAttribute(control.bind, next)}
        />
      );
    case "text":
      return (
        <TextControl
          label={control.label}
          value={String(value ?? "")}
          onChange={(next) => setAttribute(control.bind, next)}
        />
      );
  }
}

function ToolbarControl({
  control,
  value,
  setAttribute,
  attributeType,
}: {
  control: BlockControl;
  value: AttributeValue | undefined;
  setAttribute: SetAttribute;
  attributeType?: string;
}) {
  switch (control.type) {
    case "alignment":
      return (
        <AlignmentToolbar
          value={String(value ?? "left")}
          onChange={(next) => setAttribute(control.bind, next ?? "left")}
        />
      );
    case "headingLevel":
      return (
        <HeadingLevelDropdown
          value={Number(value ?? 2)}
          options={(control.options ?? [1, 2, 3, 4, 5, 6]).map(Number)}
          onChange={(next) => setAttribute(control.bind, Number(next))}
        />
      );
    case "select":
      return (
        <ToolbarDropdownMenu
          label={control.label}
          icon="admin-settings"
          controls={controlOptions(control).map((option) => ({
            title: option.label,
            isActive: String(value ?? "") === option.value,
            onClick: () =>
              setAttribute(
                control.bind,
                coerceControlValue(option.value, attributeType),
              ),
          }))}
        />
      );
    case "toggle":
      return (
        <ToolbarButton
          icon="yes-alt"
          title={control.label}
          isActive={Boolean(value)}
          onClick={() => setAttribute(control.bind, !Boolean(value))}
        />
      );
    case "link":
    case "text":
      return (
        <Dropdown
          popoverProps={{ placement: "bottom-start" }}
          renderToggle={({ isOpen, onToggle }) => (
            <ToolbarButton
              icon={control.type === "link" ? "admin-links" : "edit"}
              title={control.label}
              isActive={isOpen || Boolean(value)}
              onClick={onToggle}
            />
          )}
          renderContent={() => (
            <div style={{ minWidth: 280, padding: 12 }}>
              {control.type === "link" ? (
                <URLInput
                  label={control.label}
                  value={String(value ?? "")}
                  onChange={(next) => setAttribute(control.bind, next)}
                />
              ) : (
                <TextControl
                  label={control.label}
                  value={String(value ?? "")}
                  onChange={(next) => setAttribute(control.bind, next)}
                />
              )}
            </div>
          )}
        />
      );
  }
}

function getAllowedRichTextFormats(meta: EffectiveBlockMeta): string[] {
  return (meta.customEditor?.allowedRichText ?? []).flatMap((format) => {
    const wpFormat =
      richTextFormatMap[format as keyof typeof richTextFormatMap];
    return wpFormat ? [wpFormat] : [];
  });
}

function isCustomBlockDefinition(
  definition: unknown,
): definition is CustomBlockDefinition {
  const meta = (definition as { meta?: CustomBlockMeta }).meta;
  return meta?.customEditor?.source === "custom";
}

function getWordPressSupports(meta: EffectiveBlockMeta) {
  const { innerBlocks, allowedBlocks, template, ...supports } =
    meta.supports ?? {};
  const splitting = meta.customEditor?.splitting
    ? { splitting: true }
    : undefined;
  const effectiveSupports = { ...supports, ...splitting };

  return Object.keys(effectiveSupports).length > 0
    ? effectiveSupports
    : undefined;
}

function getInnerBlocksConfig(meta: EffectiveBlockMeta) {
  if (!meta.supports?.innerBlocks) {
    return undefined;
  }

  const { allowedBlocks, template } = meta.supports;
  return {
    // Empty `[]` in block.json means "no restriction" (all blocks), not "none".
    allowedBlocks: allowedBlocks?.length ? allowedBlocks : undefined,
    template,
  };
}

function GenericBlockEdit({
  definition,
  meta,
  attributes,
  clientId,
  adjacentClientIds,
  editorActions,
  setAttribute,
}: {
  definition: CustomBlockDefinition;
  meta: EffectiveBlockMeta;
  attributes: Attributes;
  clientId: string;
  adjacentClientIds: { next: string | null; previous: string | null };
  editorActions: BlockEditorActions;
  setAttribute: SetAttribute;
}) {
  const { Component } = definition;
  const allowedFormats = getAllowedRichTextFormats(meta);
  const splitting = meta.customEditor?.splitting === true;
  const slots = Object.fromEntries(
    Object.entries(meta.attributes)
      .filter(([, attribute]) => attribute.richText)
      .map(([attributeName, attribute]) => [
        attributeName,
        <RichText
          key={attributeName}
          tagName={attribute.tagName ?? "span"}
          value={String(attributes[attributeName] ?? "")}
          allowedFormats={allowedFormats}
          placeholder={attribute.placeholder}
          onChange={(nextValue) => setAttribute(attributeName, nextValue)}
          onSplit={
            splitting
              ? (value, isOriginal) => {
                  const nextAttributes = {
                    ...attributes,
                    [attributeName]: value,
                  };
                  const block = createBlock(meta.name, nextAttributes);
                  if (isOriginal) {
                    block.clientId = clientId;
                  }
                  return block;
                }
              : undefined
          }
          onReplace={
            splitting
              ? (blocks, indexToSelect, initialPosition) =>
                  editorActions.replaceBlocks(
                    clientId,
                    blocks,
                    indexToSelect,
                    initialPosition,
                  )
              : undefined
          }
          onMerge={
            splitting
              ? (forward) => {
                  const adjacentClientId = forward
                    ? adjacentClientIds.next
                    : adjacentClientIds.previous;
                  if (!adjacentClientId) {
                    return;
                  }
                  editorActions.mergeBlocks(
                    forward ? clientId : adjacentClientId,
                    forward ? adjacentClientId : clientId,
                  );
                }
              : undefined
          }
        />,
      ]),
  );
  const innerBlocksConfig = getInnerBlocksConfig(meta);
  const innerBlocks = innerBlocksConfig ? (
    <InnerBlocks
      allowedBlocks={innerBlocksConfig.allowedBlocks}
      template={innerBlocksConfig.template}
    />
  ) : null;
  const className =
    getCapabilityClassName(meta, attributes) || undefined;

  return (
    <Component
      {...attributes}
      className={className}
      slots={slots}
    >
      {innerBlocks}
    </Component>
  );
}

function registerCustomBlock(definition: CustomBlockDefinition) {
  const meta = normalizeMeta(definition.meta);
  const inspectorControls = meta.customControls.inspector;
  const toolbarControls = meta.customControls.toolbar;
  const { supports: ignoredSupports, ...blockSettings } = meta;
  void ignoredSupports;

  registerBlockType(meta.name, {
    ...blockSettings,
    supports: getWordPressSupports(meta),
    icon: meta.icon as never,
    merge(attributes, attributesToMerge) {
      const richTextAttribute = Object.entries(meta.attributes).find(
        ([, attribute]) => attribute.richText,
      )?.[0];
      if (!richTextAttribute) {
        return attributes;
      }
      return {
        ...attributes,
        [richTextAttribute]: `${String(attributes[richTextAttribute] ?? "")}${String(
          attributesToMerge[richTextAttribute] ?? "",
        )}`,
      };
    },
    edit({ attributes, clientId, setAttributes }) {
      const normalized = normalizeAttributes(
        meta,
        attributes as Attributes,
      );
      const blockProps = useBlockProps();
      const editorActions = useDispatch(
        blockEditorStore,
      ) as unknown as BlockEditorActions;
      const adjacentClientIds = useSelect(
        (select) => {
          const selectors = select(
            blockEditorStore,
          ) as unknown as BlockEditorSelectors;
          return {
            next: selectors.getNextBlockClientId(clientId),
            previous: selectors.getPreviousBlockClientId(clientId),
          };
        },
        [clientId],
      );
      const setAttribute: SetAttribute = (name, value) => {
        setAttributes({ [name]: value });
      };

      return (
        <>
          {toolbarControls.length > 0 && (
            <BlockControls>
              <ToolbarGroup>
                {toolbarControls.map((control, index) => (
                  <ToolbarControl
                    key={`${meta.name}-${control.bind}-${control.type}-${index}`}
                    control={control}
                    value={normalized[control.bind]}
                    setAttribute={setAttribute}
                    attributeType={meta.attributes[control.bind]?.type}
                  />
                ))}
              </ToolbarGroup>
            </BlockControls>
          )}
          {inspectorControls.length > 0 && (
            <InspectorControls>
              <PanelBody title={`${meta.title} settings`}>
                {inspectorControls.map((control, index) => (
                  <InspectorControlField
                    key={`${meta.name}-${control.bind}-${control.type}-${index}`}
                    control={control}
                    value={normalized[control.bind]}
                    setAttribute={setAttribute}
                    attributeType={meta.attributes[control.bind]?.type}
                  />
                ))}
              </PanelBody>
            </InspectorControls>
          )}
          <div {...blockProps}>
            <GenericBlockEdit
              definition={definition}
              meta={meta}
              attributes={normalized}
              clientId={clientId}
              adjacentClientIds={adjacentClientIds}
              editorActions={editorActions}
              setAttribute={setAttribute}
            />
          </div>
        </>
      );
    },
    save() {
      if (meta.supports?.innerBlocks) {
        return (
          <div {...useBlockProps.save()}>
            <InnerBlocksContent />
          </div>
        );
      }

      return null;
    },
  });
}

const customBlocks = (Object.values(blockRegistry) as unknown[]).filter(
  isCustomBlockDefinition,
);

customBlocks.forEach(registerCustomBlock);
setDefaultBlockName("chadpress/text");
