import { blockDefinition as block_buttonDefinition } from "./button"
import { blockDefinition as block_cardDefinition } from "./card"
import { blockDefinition as block_card_contentDefinition } from "./card-content"
import { blockDefinition as block_card_descriptionDefinition } from "./card-description"
import { blockDefinition as block_card_footerDefinition } from "./card-footer"
import { blockDefinition as block_card_headerDefinition } from "./card-header"
import { blockDefinition as block_card_titleDefinition } from "./card-title"
import { blockDefinition as block_columnDefinition } from "./column"
import { blockDefinition as block_columnsDefinition } from "./columns"
import { blockDefinition as block_headingDefinition } from "./heading"
import { blockDefinition as block_imageDefinition } from "./image"
import { blockDefinition as block_listDefinition } from "./list"
import { blockDefinition as block_list_itemDefinition } from "./list-item"
import { blockDefinition as block_quoteDefinition } from "./quote"
import { blockDefinition as block_sectionDefinition } from "./section"
import { blockDefinition as block_textDefinition } from "./text"

export const blockRegistry = {
  "chadpress/button": block_buttonDefinition,
  "chadpress/card": block_cardDefinition,
  "chadpress/card-content": block_card_contentDefinition,
  "chadpress/card-description": block_card_descriptionDefinition,
  "chadpress/card-footer": block_card_footerDefinition,
  "chadpress/card-header": block_card_headerDefinition,
  "chadpress/card-title": block_card_titleDefinition,
  "chadpress/column": block_columnDefinition,
  "chadpress/columns": block_columnsDefinition,
  "chadpress/heading": block_headingDefinition,
  "chadpress/image": block_imageDefinition,
  "chadpress/list": block_listDefinition,
  "chadpress/list-item": block_list_itemDefinition,
  "chadpress/quote": block_quoteDefinition,
  "chadpress/section": block_sectionDefinition,
  "chadpress/text": block_textDefinition,
} as const

export type BlockName = keyof typeof blockRegistry
