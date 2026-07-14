/**
 * Blocks whose inner-block list should participate in the parent's layout as if
 * the wrapper were absent. Keep in sync with the Next `BlockRenderer` inner
 * wrapper (`display: contents` on the inner list container).
 */
export const LAYOUT_CONTAINER_BLOCK_NAMES = new Set([
  "chadpress/section",
  "chadpress/columns",
  "chadpress/column",
  "chadpress/card",
  "chadpress/card-header",
  "chadpress/card-content",
  "chadpress/card-footer",
])

export function isLayoutContainerBlock(name: string): boolean {
  return LAYOUT_CONTAINER_BLOCK_NAMES.has(name)
}
