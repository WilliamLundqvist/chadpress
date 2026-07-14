import type { ComponentType, ReactNode } from "react";

import {
  AlignmentToolbar,
  BlockControls,
  HeadingLevelDropdown,
  InnerBlocks,
  InspectorControls,
  MediaPlaceholder,
  MediaUpload,
  MediaUploadCheck,
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
import { uploadMedia } from "@wordpress/media-utils";

import {
  applyAttributeDefaults,
  blockRegistry,
  expandBlockCapabilities,
  getCapabilityClassName,
  type BlockAttributeSpec,
  type BlockControl,
  type BlockMeta,
} from "@repo/ui/blocks";

import { ListContainerEdit, ListItemEdit } from "./editors/list";

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
    strategy?: "list-container" | "list-item";
    allowedRichText?: readonly string[];
    splitting?: boolean;
  };
  parent?: readonly string[];
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

type WPMediaSize = {
  url?: string;
  width?: number;
  height?: number;
};

type WPMedia = {
  id?: number;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
  sizes?: Record<string, WPMediaSize>;
};

type WPMediaAttachment = {
  fetch: () => Promise<void>;
  get: (key: string) => unknown;
};

declare global {
  interface Window {
    wp?: {
      media?: {
        attachment: (id: number) => WPMediaAttachment;
      };
    };
  }
}

const DEFAULT_MEDIA_SIZE_SLUG = "large";

const MEDIA_RESET_ATTRIBUTES = {
  id: 0,
  url: "",
  alt: "",
  mediaWidth: 0,
  mediaHeight: 0,
  sizeSlug: DEFAULT_MEDIA_SIZE_SLUG,
} as const;

function getMediaAttributeName(
  meta: EffectiveBlockMeta,
): string | undefined {
  return Object.entries(meta.attributes).find(
    ([, attribute]) => attribute.media === true,
  )?.[0];
}

function hasSelectedMedia(attributes: Attributes): boolean {
  const url = String(attributes.url ?? "").trim();
  const id = Number(attributes.id ?? 0);
  return url.length > 0 || id > 0;
}

function resolveMediaUrl(
  media: WPMedia,
  sizeSlug: string,
): { url: string; mediaWidth: number; mediaHeight: number } {
  const size = media.sizes?.[sizeSlug];
  return {
    url: size?.url ?? media.url ?? "",
    mediaWidth: size?.width ?? media.width ?? 0,
    mediaHeight: size?.height ?? media.height ?? 0,
  };
}

function mediaSelectionToAttributes(
  media: WPMedia,
  sizeSlug: string,
): Attributes {
  const resolved = resolveMediaUrl(media, sizeSlug);
  return {
    id: media.id ?? 0,
    url: resolved.url,
    alt: media.alt ?? "",
    mediaWidth: resolved.mediaWidth,
    mediaHeight: resolved.mediaHeight,
    sizeSlug,
  };
}

async function resolveAttachmentSizeUrl(
  attachmentId: number,
  sizeSlug: string,
): Promise<{ url: string; mediaWidth: number; mediaHeight: number } | null> {
  const attachmentFactory = window.wp?.media?.attachment;
  if (!attachmentFactory) {
    return null;
  }

  const attachment = attachmentFactory(attachmentId);
  await attachment.fetch();
  const sizes = attachment.get("sizes") as Record<string, WPMediaSize> | undefined;
  const size = sizes?.[sizeSlug];
  const url =
    size?.url ??
    (attachment.get("url") as string | undefined) ??
    "";
  if (!url) {
    return null;
  }

  return {
    url,
    mediaWidth: size?.width ?? Number(attachment.get("width") ?? 0),
    mediaHeight: size?.height ?? Number(attachment.get("height") ?? 0),
  };
}

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

  return Object.keys(effectiveSupports).length > 0 ? effectiveSupports : {};
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

function MediaBlockPlaceholder({
  meta,
  attributes,
  setAttributes,
}: {
  meta: EffectiveBlockMeta;
  attributes: Attributes;
  setAttributes: (next: Partial<Attributes>) => void;
}) {
  const sizeSlug = String(attributes.sizeSlug ?? DEFAULT_MEDIA_SIZE_SLUG);

  const applySelection = (media: WPMedia) => {
    setAttributes(mediaSelectionToAttributes(media, sizeSlug));
  };

  return (
    <MediaUploadCheck>
      <MediaPlaceholder
        icon="format-image"
        labels={{
          title: meta.title,
          instructions: "Upload an image or choose one from the media library.",
        }}
        accept="image/*"
        allowedTypes={["image"]}
        onSelect={(media) => applySelection(media as WPMedia)}
        onUpload={(files) => {
          if (!files?.length) {
            return;
          }
          uploadMedia({
            filesList: files,
            onFileChange: ([media]) => {
              if (media) {
                applySelection(media as WPMedia);
              }
            },
          });
        }}
      />
    </MediaUploadCheck>
  );
}

function MediaBlockToolbar({
  meta,
  attributes,
  setAttributes,
}: {
  meta: EffectiveBlockMeta;
  attributes: Attributes;
  setAttributes: (next: Partial<Attributes>) => void;
}) {
  const sizeSlug = String(attributes.sizeSlug ?? DEFAULT_MEDIA_SIZE_SLUG);

  const applySelection = (media: WPMedia) => {
    setAttributes(mediaSelectionToAttributes(media, sizeSlug));
  };

  return (
    <BlockControls group="other">
      <ToolbarGroup>
        <MediaUploadCheck>
          <MediaUpload
            allowedTypes={["image"]}
            value={Number(attributes.id ?? 0) || undefined}
            onSelect={(media) => applySelection(media as WPMedia)}
            render={({ open }) => (
              <ToolbarButton icon="edit" label="Replace image" onClick={open} />
            )}
          />
        </MediaUploadCheck>
        <ToolbarButton
          icon="no-alt"
          label="Remove image"
          onClick={() => setAttributes({ ...MEDIA_RESET_ATTRIBUTES })}
        />
      </ToolbarGroup>
    </BlockControls>
  );
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

function ListItemBlockEdit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: Attributes;
  setAttributes: (attrs: Attributes) => void;
  clientId: string;
}) {
  const editorActions = useDispatch(
    blockEditorStore,
  ) as unknown as BlockEditorActions;

  return (
    <ListItemEdit
      attributes={attributes}
      setAttributes={setAttributes}
      clientId={clientId}
      mergeBlocks={editorActions.mergeBlocks}
    />
  );
}

function registerCustomBlock(definition: CustomBlockDefinition) {
  const meta = normalizeMeta(definition.meta);
  const strategy = meta.customEditor?.strategy;
  const inspectorControls = meta.customControls.inspector;
  const toolbarControls = meta.customControls.toolbar;
  const { supports: ignoredSupports, parent, ...blockSettings } = meta;
  void ignoredSupports;

  registerBlockType(meta.name, {
    ...blockSettings,
    ...(parent?.length ? { parent: [...parent] } : {}),
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
    edit(props) {
      const { attributes, clientId, setAttributes } = props as {
        attributes: Attributes;
        clientId: string;
        setAttributes: (attrs: Attributes) => void;
      };

      if (strategy === "list-container") {
        return (
          <ListContainerEdit
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        );
      }

      if (strategy === "list-item") {
        return (
          <ListItemBlockEdit
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        );
      }

      const normalized = normalizeAttributes(meta, attributes);
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
        if (name === "sizeSlug") {
          const attachmentId = Number(normalized.id ?? 0);
          const nextSizeSlug = String(value);
          if (attachmentId > 0) {
            void resolveAttachmentSizeUrl(attachmentId, nextSizeSlug).then(
              (resolved) => {
                if (resolved) {
                  setAttributes({
                    sizeSlug: nextSizeSlug,
                    url: resolved.url,
                    mediaWidth: resolved.mediaWidth,
                    mediaHeight: resolved.mediaHeight,
                  } as Attributes);
                  return;
                }
                setAttributes({ sizeSlug: nextSizeSlug } as Attributes);
              },
            );
            return;
          }
        }
        setAttributes({ [name]: value } as Attributes);
      };
      const mediaAttributeName = getMediaAttributeName(meta);
      const isMediaBlock = mediaAttributeName !== undefined;
      const showMediaPlaceholder =
        isMediaBlock && !hasSelectedMedia(normalized);

      return (
        <>
          {isMediaBlock && hasSelectedMedia(normalized) ? (
            <MediaBlockToolbar
              meta={meta}
              attributes={normalized}
              setAttributes={setAttributes}
            />
          ) : null}
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
            {showMediaPlaceholder ? (
              <MediaBlockPlaceholder
                meta={meta}
                attributes={normalized}
                setAttributes={setAttributes}
              />
            ) : (
              <GenericBlockEdit
                definition={definition}
                meta={meta}
                attributes={normalized}
                clientId={clientId}
                adjacentClientIds={adjacentClientIds}
                editorActions={editorActions}
                setAttribute={setAttribute}
              />
            )}
          </div>
        </>
      );
    },
    save() {
      // Persist children as nested block comments only. No wrapper HTML is
      // stored; both runtimes rebuild the DOM from the shared component.
      if (meta.supports?.innerBlocks) {
        return <InnerBlocksContent />;
      }

      return null;
    },
    // Migrates content saved by the earlier generator, which wrapped inner
    // blocks in a `wp-block-*` div.
    deprecated: [
      {
        attributes: meta.attributes as never,
        supports: getWordPressSupports(meta) as never,
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
      },
    ] as never,
  });
}

const customBlocks = (Object.values(blockRegistry) as unknown[]).filter(
  isCustomBlockDefinition,
);

customBlocks.forEach(registerCustomBlock);
setDefaultBlockName("chadpress/text");
