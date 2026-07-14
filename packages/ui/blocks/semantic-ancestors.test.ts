import { describe, expect, it } from "vitest"

import {
  isDirectChildOfSemanticList,
  isSemanticListContainerBlock,
  isSemanticListItemBlock,
} from "./semantic-ancestors"

describe("semantic-ancestors", () => {
  it("identifies list blocks", () => {
    expect(isSemanticListContainerBlock("chadpress/list")).toBe(true)
    expect(isSemanticListContainerBlock("chadpress/text")).toBe(false)
  })

  it("identifies list item blocks", () => {
    expect(isSemanticListItemBlock("chadpress/list-item")).toBe(true)
    expect(isSemanticListItemBlock("chadpress/list")).toBe(false)
  })

  it("detects direct children of semantic lists", () => {
    expect(isDirectChildOfSemanticList("chadpress/list")).toBe(true)
    expect(isDirectChildOfSemanticList("chadpress/text")).toBe(false)
    expect(isDirectChildOfSemanticList(undefined)).toBe(false)
  })
})
