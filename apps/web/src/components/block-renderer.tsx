import type { ComponentType, ReactNode } from "react";

import {
  getCapabilityClassName,
  getBlockDefinition,
  isBlockName,
  isLayoutContainerBlock,
} from "@repo/ui/blocks";
import {
  normalizeEditorBlock,
  type WpEditorBlock,
} from "../lib/wp-block-query";

type BlockRendererProps = {
  blocks: WpEditorBlock[] | null | undefined;
};

/**
 * Renders a flat (or tree) of WPGraphQL `editorBlocks` by looking up
 * `block.name` in `@repo/ui` `blockRegistry`. Attribute defaults come from
 * each `block.json` in the registry.
 */
export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks?.length) {
    return null;
  }
  return (
    <div className="chadpress-blocks">
      {blocks.map((block) => (
        <BlockNode key={block.clientId} block={block} />
      ))}
    </div>
  );
}

function BlockNode({
  block,
  parentName,
}: {
  block: WpEditorBlock;
  parentName?: string;
}) {
  if (!isBlockName(block.name)) {
    console.error(`[BlockRenderer] Unsupported block: ${block.name}`);
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="rounded border border-dashed border-amber-600/50 bg-amber-50 p-2 text-sm text-amber-900">
          <span className="font-medium">Unsupported block in registry:</span>{" "}
          {block.name}
        </div>
      );
    }
    return null;
  }

  const def = getBlockDefinition(block.name);
  if (!def) {
    console.warn(`[BlockRenderer] Missing block definition: ${block.name}`);
    return null;
  }

  const raw = normalizeEditorBlock(block.name, block.attributes);
  if (raw === null) {
    console.warn(`[BlockRenderer] Could not normalize block: ${block.name}`);
    return null;
  }

  const Comp = def.Component as ComponentType<
    Record<string, unknown> & { className?: string; children?: ReactNode }
  >;
  const supportsInnerBlocks = Boolean(def.meta.supports?.innerBlocks);
  const isChildOfLayout =
    parentName !== undefined && isLayoutContainerBlock(parentName);
  const innerUseContents =
    supportsInnerBlocks && isLayoutContainerBlock(block.name);
  const capabilityClassName = getCapabilityClassName(
    def.meta as Parameters<typeof getCapabilityClassName>[0],
    raw,
  );

  const innerBlocks =
    block.innerBlocks && block.innerBlocks.length > 0 ? (
      <div
        className={innerUseContents ? "contents" : "chadpress-inner"}
      >
        {block.innerBlocks.map((child) => (
          <BlockNode
            key={child.clientId}
            block={child}
            parentName={block.name}
          />
        ))}
      </div>
    ) : null;

  return (
    <div
      className={
        isChildOfLayout
          ? "chadpress-block contents"
          : "chadpress-block"
      }
      data-wp-block={block.name}
    >
      <Comp
        {...(raw as Record<string, unknown>)}
        className={capabilityClassName}
      >
        {supportsInnerBlocks ? innerBlocks : null}
      </Comp>
      {!supportsInnerBlocks && innerBlocks}
    </div>
  );
}
