export const LIST_BLOCK_NAME = "chadpress/list"
export const LIST_ITEM_BLOCK_NAME = "chadpress/list-item"

export function isListBlockName(name: string | undefined): boolean {
  return name === LIST_BLOCK_NAME
}

export function isListItemBlockName(name: string | undefined): boolean {
  return name === LIST_ITEM_BLOCK_NAME
}
