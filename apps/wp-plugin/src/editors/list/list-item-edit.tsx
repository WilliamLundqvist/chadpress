import {
  BlockControls,
  RichText,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from "@wordpress/block-editor"
import { createBlock } from "@wordpress/blocks"
import { ToolbarButton, ToolbarGroup } from "@wordpress/components"
import { useDispatch, useSelect } from "@wordpress/data"
import { useCallback, useEffect, useRef } from "@wordpress/element"

import { LIST_BLOCK_NAME, LIST_ITEM_BLOCK_NAME } from "./constants"
import {
  useIndentListItem,
  useListItemEnter,
  useListItemMerge,
  useListItemSpace,
  useOutdentListItem,
} from "./hooks"

type ListItemAttributes = {
  content?: string
}

type ListItemEditProps = {
  attributes: ListItemAttributes
  setAttributes: (attrs: Partial<ListItemAttributes>) => void
  clientId: string
  mergeBlocks: (firstClientId: string, secondClientId: string) => void
}

const richTextFormats = ["core/bold", "core/italic", "core/link"]

export function ListItemEdit({
  attributes,
  setAttributes,
  clientId,
  mergeBlocks,
}: ListItemEditProps) {
  const { content = "" } = attributes
  const blockProps = useBlockProps()
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: [LIST_BLOCK_NAME],
    renderAppender: false,
  })
  const { replaceBlocks } = useDispatch(blockEditorStore)
  const { getNextBlockClientId, getPreviousBlockClientId } = useSelect(
    (select) => select(blockEditorStore),
    [],
  )

  const indentListItem = useIndentListItem(clientId)
  const outdentListItem = useOutdentListItem()
  const bindSpace = useListItemSpace(clientId)
  const bindEnter = useListItemEnter({ content, clientId })
  const richTextRef = useRef<HTMLElement | null>(null)

  const setRichTextRef = useCallback(
    (element: HTMLElement | null) => {
      richTextRef.current = element
      bindSpace(element)
      bindEnter(element)
    },
    [bindEnter, bindSpace],
  )

  useEffect(() => {
    return () => {
      bindSpace(null)
      bindEnter(null)
    }
  }, [bindEnter, bindSpace])

  const onMerge = useListItemMerge(clientId, (forward) => {
    const adjacentClientId = forward
      ? getNextBlockClientId(clientId)
      : getPreviousBlockClientId(clientId)
    if (!adjacentClientId) return
    mergeBlocks(forward ? clientId : adjacentClientId, forward ? adjacentClientId : clientId)
  })

  const canIndent = useSelect(
    (select) => select(blockEditorStore).getBlockIndex(clientId) > 0,
    [clientId],
  )
  const canOutdent = useSelect(
    (select) => {
      const { getBlockRootClientId, getBlockName } = select(blockEditorStore)
      return (
        getBlockName(getBlockRootClientId(getBlockRootClientId(clientId))) ===
        LIST_ITEM_BLOCK_NAME
      )
    },
    [clientId],
  )

  return (
    <>
      <BlockControls group="block">
        <ToolbarGroup>
          <ToolbarButton
            icon="editor-outdent"
            title="Outdent"
            disabled={!canOutdent}
            onClick={() => outdentListItem()}
          />
          <ToolbarButton
            icon="editor-indent"
            title="Indent"
            disabled={!canIndent}
            onClick={() => indentListItem()}
          />
        </ToolbarGroup>
      </BlockControls>
      <li {...innerBlocksProps}>
        <RichText
          ref={setRichTextRef}
          tagName="div"
          value={content}
          allowedFormats={richTextFormats}
          placeholder="List item…"
          onChange={(nextContent) => setAttributes({ content: nextContent })}
          onSplit={(value, isOriginal) => {
            const block = createBlock(LIST_ITEM_BLOCK_NAME, { content: value })
            if (isOriginal) {
              block.clientId = clientId
            }
            return block
          }}
          onReplace={(blocks, indexToSelect, initialPosition) =>
            replaceBlocks(clientId, blocks, indexToSelect, initialPosition)
          }
          onMerge={onMerge}
        />
        {innerBlocksProps.children}
      </li>
    </>
  )
}
