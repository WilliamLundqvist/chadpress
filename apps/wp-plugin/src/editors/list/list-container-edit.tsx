import {
  BlockControls,
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from "@wordpress/block-editor"
import { PanelBody, ToggleControl, ToolbarButton, ToolbarGroup } from "@wordpress/components"
import { useSelect } from "@wordpress/data"
import { ListBlock } from "@repo/ui/blocks/list"

import { LIST_ITEM_BLOCK_NAME } from "./constants"
import { useOutdentList } from "./hooks"

type ListContainerAttributes = {
  ordered?: boolean
}

type ListContainerEditProps = {
  attributes: ListContainerAttributes
  setAttributes: (attrs: Partial<ListContainerAttributes>) => void
  clientId: string
}

const DEFAULT_BLOCK = { name: LIST_ITEM_BLOCK_NAME }
const TEMPLATE = [[LIST_ITEM_BLOCK_NAME]]

export function ListContainerEdit({
  attributes,
  setAttributes,
  clientId,
}: ListContainerEditProps) {
  const { ordered = false } = attributes
  const blockProps = useBlockProps()
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: [LIST_ITEM_BLOCK_NAME],
    defaultBlock: DEFAULT_BLOCK,
    directInsert: true,
    template: TEMPLATE,
    templateLock: false,
    templateInsertUpdatesSelection: true,
  })
  const outdentList = useOutdentList(clientId)
  const canOutdent = useSelect(
    (select) => {
      const { getBlockRootClientId, getBlockName } = select(blockEditorStore)
      return getBlockName(getBlockRootClientId(clientId)) === LIST_ITEM_BLOCK_NAME
    },
    [clientId],
  )

  return (
    <>
      <BlockControls group="block">
        <ToolbarGroup>
          <ToolbarButton
            icon="editor-ul"
            title="Unordered"
            isActive={!ordered}
            onClick={() => setAttributes({ ordered: false })}
          />
          <ToolbarButton
            icon="editor-ol"
            title="Ordered"
            isActive={ordered}
            onClick={() => setAttributes({ ordered: true })}
          />
          <ToolbarButton
            icon="editor-outdent"
            title="Outdent list"
            disabled={!canOutdent}
            onClick={outdentList}
          />
        </ToolbarGroup>
      </BlockControls>
      <InspectorControls>
        <PanelBody title="List settings">
          <ToggleControl
            label="Ordered list"
            checked={ordered}
            onChange={(value) => setAttributes({ ordered: value })}
          />
        </PanelBody>
      </InspectorControls>
      <ListBlock ordered={ordered} {...innerBlocksProps} />
    </>
  )
}
