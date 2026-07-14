/**
 * Blocks that require valid HTML list semantics (`ul`/`ol` → `li`).
 * Keep in sync with `BlockRenderer` wrapper policy and list editor modules.
 */
export const SEMANTIC_LIST_CONTAINER_BLOCK = "chadpress/list" as const
export const SEMANTIC_LIST_ITEM_BLOCK = "chadpress/list-item" as const

export function isSemanticListContainerBlock(name: string): boolean {
  return name === SEMANTIC_LIST_CONTAINER_BLOCK
}

export function isSemanticListItemBlock(name: string): boolean {
  return name === SEMANTIC_LIST_ITEM_BLOCK
}

export function isDirectChildOfSemanticList(parentName?: string): boolean {
  return parentName === SEMANTIC_LIST_CONTAINER_BLOCK
}
