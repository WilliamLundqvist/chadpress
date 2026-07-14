import { useCallback } from "@wordpress/element"
import { useDispatch, useRegistry, useSelect } from "@wordpress/data"
import { store as blockEditorStore } from "@wordpress/block-editor"
import { cloneBlock, createBlock } from "@wordpress/blocks"

import { LIST_BLOCK_NAME, LIST_ITEM_BLOCK_NAME } from "./constants"

type BlockEditorStore = typeof blockEditorStore

export function useOutdentListItem() {
  const registry = useRegistry()
  const { moveBlocksToPosition, removeBlock, insertBlock, updateBlockListSettings } =
    useDispatch<BlockEditorStore>(blockEditorStore)
  const {
    getBlockRootClientId,
    getBlockName,
    getBlockOrder,
    getBlockIndex,
    getSelectedBlockClientIds,
    getBlock,
    getBlockListSettings,
  } = useSelect((select) => select(blockEditorStore), [])

  const getParentListItemId = useCallback(
    (id: string) => {
      const listId = getBlockRootClientId(id)
      if (!listId) return undefined
      const parentListItemId = getBlockRootClientId(listId)
      if (!parentListItemId) return undefined
      if (getBlockName(parentListItemId) !== LIST_ITEM_BLOCK_NAME) return undefined
      return parentListItemId
    },
    [getBlockName, getBlockRootClientId],
  )

  return useCallback(
    (clientIds = getSelectedBlockClientIds()) => {
      if (!Array.isArray(clientIds)) {
        clientIds = [clientIds]
      }
      if (!clientIds.length) return false

      const firstClientId = clientIds[0]
      if (getBlockName(firstClientId) !== LIST_ITEM_BLOCK_NAME) return false

      const parentListItemId = getParentListItemId(firstClientId)
      if (!parentListItemId) return false

      const parentListId = getBlockRootClientId(firstClientId)
      if (!parentListId) return false

      const lastClientId = clientIds[clientIds.length - 1]
      const order = getBlockOrder(parentListId)
      const followingListItems = order.slice(getBlockIndex(lastClientId) + 1)

      registry.batch(() => {
        if (followingListItems.length) {
          let nestedListId = getBlockOrder(firstClientId)[0]
          if (!nestedListId) {
            const nestedListBlock = cloneBlock(getBlock(parentListId), {}, [])
            nestedListId = nestedListBlock.clientId
            insertBlock(nestedListBlock, 0, firstClientId, false)
            updateBlockListSettings(
              nestedListId,
              getBlockListSettings(parentListId),
            )
          }
          moveBlocksToPosition(followingListItems, parentListId, nestedListId)
        }
        moveBlocksToPosition(
          clientIds,
          parentListId,
          getBlockRootClientId(parentListItemId)!,
          getBlockIndex(parentListItemId) + 1,
        )
        if (!getBlockOrder(parentListId).length) {
          removeBlock(parentListId, false)
        }
      })

      return true
    },
    [
      getBlock,
      getBlockIndex,
      getBlockListSettings,
      getBlockName,
      getBlockOrder,
      getBlockRootClientId,
      getParentListItemId,
      getSelectedBlockClientIds,
      insertBlock,
      moveBlocksToPosition,
      registry,
      removeBlock,
      updateBlockListSettings,
    ],
  )
}

export function useIndentListItem(clientId: string) {
  const { replaceBlocks, selectionChange, multiSelect } =
    useDispatch<BlockEditorStore>(blockEditorStore)
  const {
    getBlock,
    getPreviousBlockClientId,
    getSelectionStart,
    getSelectionEnd,
    hasMultiSelection,
    getMultiSelectedBlockClientIds,
  } = useSelect((select) => select(blockEditorStore), [])

  return useCallback(() => {
    const multi = hasMultiSelection()
    const clientIds = multi ? getMultiSelectedBlockClientIds() : [clientId]
    const clonedBlocks = clientIds.map((id) => cloneBlock(getBlock(id)))
    const previousSiblingId = getPreviousBlockClientId(clientId)
    if (!previousSiblingId) return false

    const newListItem = cloneBlock(getBlock(previousSiblingId))
    if (!newListItem.innerBlocks?.length) {
      newListItem.innerBlocks = [createBlock(LIST_BLOCK_NAME)]
    }
    newListItem.innerBlocks[newListItem.innerBlocks.length - 1].innerBlocks.push(
      ...clonedBlocks,
    )

    const selectionStart = getSelectionStart()
    const selectionEnd = getSelectionEnd()
    replaceBlocks([previousSiblingId, ...clientIds], [newListItem])

    if (!multi) {
      selectionChange(
        clonedBlocks[0].clientId,
        selectionEnd.attributeKey,
        selectionEnd.clientId === selectionStart.clientId
          ? selectionStart.offset
          : selectionEnd.offset,
        selectionEnd.offset,
      )
    } else {
      multiSelect(
        clonedBlocks[0].clientId,
        clonedBlocks[clonedBlocks.length - 1].clientId,
      )
    }

    return true
  }, [
    clientId,
    getBlock,
    getMultiSelectedBlockClientIds,
    getPreviousBlockClientId,
    getSelectionEnd,
    getSelectionStart,
    hasMultiSelection,
    multiSelect,
    replaceBlocks,
    selectionChange,
  ])
}

export function useListItemSpace(clientId: string) {
  const { getSelectionStart, getSelectionEnd, getBlockIndex } = useSelect(
    (select) => select(blockEditorStore),
    [],
  )
  const indentListItem = useIndentListItem(clientId)
  const outdentListItem = useOutdentListItem()

  return useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => undefined

      function onKeyDown(event: KeyboardEvent) {
        const { keyCode, shiftKey, altKey, metaKey, ctrlKey } = event
        const TAB = 9
        const SPACE = 32
        if (
          event.defaultPrevented ||
          (keyCode !== SPACE && keyCode !== TAB) ||
          altKey ||
          metaKey ||
          ctrlKey
        ) {
          return
        }

        const selectionStart = getSelectionStart()
        const selectionEnd = getSelectionEnd()
        if (selectionStart.offset !== 0 || selectionEnd.offset !== 0) return

        if (shiftKey) {
          if (keyCode === TAB && outdentListItem()) {
            event.preventDefault()
          }
          return
        }

        if (getBlockIndex(clientId) !== 0 && indentListItem()) {
          event.preventDefault()
        }
      }

      element.addEventListener("keydown", onKeyDown)
      return () => {
        element.removeEventListener("keydown", onKeyDown)
      }
    },
    [
      clientId,
      getBlockIndex,
      getSelectionEnd,
      getSelectionStart,
      indentListItem,
      outdentListItem,
    ],
  )
}

export function useListItemEnter(props: { content: string; clientId: string }) {
  const { replaceBlocks, selectionChange } =
    useDispatch<BlockEditorStore>(blockEditorStore)
  const { getBlock, getBlockRootClientId, getBlockIndex, getBlockName } =
    useSelect((select) => select(blockEditorStore), [])
  const outdentListItem = useOutdentListItem()

  return useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => undefined

      function onKeyDown(event: KeyboardEvent) {
        const ENTER = 13
        if (event.defaultPrevented || event.keyCode !== ENTER) return
        if (props.content.length) return

        event.preventDefault()

        const canOutdent =
          getBlockName(
            getBlockRootClientId(getBlockRootClientId(props.clientId)!),
          ) === LIST_ITEM_BLOCK_NAME

        if (canOutdent) {
          outdentListItem(props.clientId)
          return
        }

        const topParentListBlock = getBlock(getBlockRootClientId(props.clientId)!)
        const blockIndex = getBlockIndex(props.clientId)
        const head = cloneBlock({
          ...topParentListBlock,
          innerBlocks: topParentListBlock.innerBlocks.slice(0, blockIndex),
        })
        const middle = createBlock("chadpress/text")
        const after = [
          ...(topParentListBlock.innerBlocks[blockIndex].innerBlocks[0]
            ?.innerBlocks || []),
          ...topParentListBlock.innerBlocks.slice(blockIndex + 1),
        ]
        const tail = after.length
          ? [
              cloneBlock({
                ...topParentListBlock,
                innerBlocks: after,
              }),
            ]
          : []

        replaceBlocks(topParentListBlock.clientId, [head, middle, ...tail], 1)
        selectionChange(middle.clientId)
      }

      element.addEventListener("keydown", onKeyDown)
      return () => {
        element.removeEventListener("keydown", onKeyDown)
      }
    },
    [
      getBlock,
      getBlockIndex,
      getBlockName,
      getBlockRootClientId,
      outdentListItem,
      props.clientId,
      props.content,
      replaceBlocks,
      selectionChange,
    ],
  )
}

export function useListItemMerge(
  clientId: string,
  onMerge: (forward: boolean) => void,
) {
  const registry = useRegistry()
  const {
    getPreviousBlockClientId,
    getNextBlockClientId,
    getBlockOrder,
    getBlockRootClientId,
    getBlockName,
    getBlock,
  } = useSelect((select) => select(blockEditorStore), [])
  const { mergeBlocks, moveBlocksToPosition, removeBlock } =
    useDispatch<BlockEditorStore>(blockEditorStore)
  const outdentListItem = useOutdentListItem()

  const getParentListItemId = useCallback(
    (id: string) => {
      const listId = getBlockRootClientId(id)
      if (!listId) return undefined
      const parentListItemId = getBlockRootClientId(listId)
      if (!parentListItemId) return undefined
      if (getBlockName(parentListItemId) !== LIST_ITEM_BLOCK_NAME) return undefined
      return parentListItemId
    },
    [getBlockName, getBlockRootClientId],
  )

  const getTrailingId = (id: string): string => {
    const order = getBlockOrder(id)
    if (!order.length) return id
    return getTrailingId(order[order.length - 1])
  }

  const getNextId = useCallback(
    (id: string): string | undefined => {
      const next = getNextBlockClientId(id)
      if (next) return next
      const parentListItemId = getParentListItemId(id)
      if (!parentListItemId) return undefined
      return getNextId(parentListItemId)
    },
    [getNextBlockClientId, getParentListItemId],
  )

  return useCallback(
    (forward: boolean) => {
      function mergeWithNested(clientIdA: string, clientIdB: string) {
        registry.batch(() => {
          const [nestedListClientId] = getBlockOrder(clientIdB)
          if (nestedListClientId) {
            if (
              getPreviousBlockClientId(clientIdB) === clientIdA &&
              !getBlockOrder(clientIdA).length
            ) {
              moveBlocksToPosition([nestedListClientId], clientIdB, clientIdA)
            } else {
              moveBlocksToPosition(
                getBlockOrder(nestedListClientId),
                nestedListClientId,
                getBlockRootClientId(clientIdA)!,
              )
            }
          }
          mergeBlocks(clientIdA, clientIdB)
        })
      }

      if (forward) {
        const nextBlockClientId = getNextId(clientId)
        if (!nextBlockClientId) {
          onMerge(forward)
          return
        }
        if (getParentListItemId(nextBlockClientId)) {
          outdentListItem(nextBlockClientId)
        } else {
          mergeWithNested(clientId, nextBlockClientId)
        }
        return
      }

      if (getParentListItemId(clientId)) {
        outdentListItem(clientId)
        return
      }

      const previousBlockClientId = getPreviousBlockClientId(clientId)
      if (previousBlockClientId) {
        mergeWithNested(getTrailingId(previousBlockClientId), clientId)
        return
      }

      onMerge(forward)
    },
    [
      clientId,
      getBlockOrder,
      getNextId,
      getParentListItemId,
      getPreviousBlockClientId,
      getTrailingId,
      mergeBlocks,
      moveBlocksToPosition,
      onMerge,
      outdentListItem,
      registry,
    ],
  )
}

export function useOutdentList(clientId: string) {
  const { replaceBlocks, selectionChange } =
    useDispatch<BlockEditorStore>(blockEditorStore)
  const { getBlockRootClientId, getBlockAttributes, getBlock } = useSelect(
    (select) => select(blockEditorStore),
    [],
  )

  return useCallback(() => {
    const parentBlockId = getBlockRootClientId(clientId)
    if (!parentBlockId) return

    const parentBlockAttributes = getBlockAttributes(parentBlockId)
    const newParentBlock = createBlock(LIST_ITEM_BLOCK_NAME, parentBlockAttributes)
    const { innerBlocks } = getBlock(clientId)
    replaceBlocks([parentBlockId], [newParentBlock, ...innerBlocks])
    selectionChange(innerBlocks[innerBlocks.length - 1].clientId)
  }, [
    clientId,
    getBlock,
    getBlockAttributes,
    getBlockRootClientId,
    replaceBlocks,
    selectionChange,
  ])
}
