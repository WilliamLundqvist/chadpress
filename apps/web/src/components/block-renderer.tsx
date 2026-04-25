import type { ComponentProps } from "react"

import { getBlockDefinition, isBlockName } from "@repo/ui/blocks"
import { normalizeEditorBlock, type WpEditorBlock } from "../lib/wp-block-query"

type BlockRendererProps = {
  blocks: WpEditorBlock[] | null | undefined
}

/**
 * Renders a flat (or tree) of WPGraphQL `editorBlocks` by looking up
 * `block.name` in `@repo/ui` `blockRegistry`. Attribute defaults come from
 * each `block.json` in the registry.
 */
export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks?.length) {
    return null
  }
  return (
    <div className="chadpress-blocks max-w-3xl space-y-4">
      {blocks.map((block, index) => (
        <BlockNode
          key={`${block.name}-${index}`}
          block={block}
        />
      ))}
    </div>
  )
}

function BlockNode({ block }: { block: WpEditorBlock }) {
  if (!isBlockName(block.name)) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="rounded border border-dashed border-amber-600/50 bg-amber-50 p-2 text-sm text-amber-900">
          <span className="font-medium">Unsupported block in registry:</span> {block.name}
        </div>
      )
    }
    return null
  }

  const def = getBlockDefinition(block.name)
  if (!def) {
    return null
  }

  const raw = normalizeEditorBlock(block.name, block.attributes)
  if (raw === null) {
    return null
  }

  const Comp = def.Component

  return (
    <div className="chadpress-block" data-wp-block={block.name}>
      <Comp
        {...(raw as ComponentProps<typeof Comp>)}
        className="chadpress-block__inner"
      />
      {block.innerBlocks && block.innerBlocks.length > 0 && (
        <div className="chadpress-inner relative mt-2 space-y-2 border-l-2 border-neutral-200 pl-3">
          {block.innerBlocks.map((child, index) => (
            <BlockNode
              key={`${child.name}-nested-${index}`}
              block={child}
            />
          ))}
        </div>
      )}
    </div>
  )
}
