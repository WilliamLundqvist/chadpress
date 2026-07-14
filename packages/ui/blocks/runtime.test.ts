import { describe, expect, it } from "vitest"

import { blockDefinition as imageDefinition } from "./image"
import {
  applyAttributeDefaults,
  getBlockAttributeKeys,
  type BlockMeta,
} from "./runtime"

const meta: BlockMeta = {
  name: "chadpress/test-block",
  attributes: {
    content: { type: "string", default: "hello" },
    level: { type: "number", default: 2 },
    href: { type: "string" },
  },
  capabilities: ["align"],
}

describe("applyAttributeDefaults", () => {
  it("fills missing attributes with defaults, including capability attributes", () => {
    expect(applyAttributeDefaults(meta, {})).toEqual({
      content: "hello",
      level: 2,
      align: "left",
    })
  })

  it("keeps explicit values over defaults", () => {
    expect(
      applyAttributeDefaults(meta, { content: "custom", align: "right" }),
    ).toEqual({
      content: "custom",
      level: 2,
      align: "right",
    })
  })

  it("treats null attribute values as missing", () => {
    expect(applyAttributeDefaults(meta, { level: null, content: null })).toEqual(
      {
        content: "hello",
        level: 2,
        align: "left",
      },
    )
  })

  it("handles null and undefined attribute input", () => {
    const expected = { content: "hello", level: 2, align: "left" }
    expect(applyAttributeDefaults(meta, null)).toEqual(expected)
    expect(applyAttributeDefaults(meta, undefined)).toEqual(expected)
  })

  it("leaves attributes without a default absent", () => {
    expect(applyAttributeDefaults(meta, {})).not.toHaveProperty("href")
  })

  it("preserves keys the meta does not declare", () => {
    expect(applyAttributeDefaults(meta, { extra: 1 })).toMatchObject({
      extra: 1,
    })
  })

  it("parses JSON strings for object-typed attributes", () => {
    const objectMeta: BlockMeta = {
      name: "chadpress/object-block",
      attributes: { style: { type: "object" } },
    }
    expect(
      applyAttributeDefaults(objectMeta, { style: '{"spacing":8}' }),
    ).toEqual({ style: { spacing: 8 } })
  })
})

describe("getBlockAttributeKeys", () => {
  it("includes capability attributes alongside the block's own attributes", () => {
    expect([...getBlockAttributeKeys(meta)].sort()).toEqual([
      "align",
      "content",
      "href",
      "level",
    ])
  })

  it("returns only the block's own attributes when there are no capabilities", () => {
    expect(
      getBlockAttributeKeys({
        attributes: { content: { type: "string" } },
      }),
    ).toEqual(["content"])
  })
})

describe("chadpress/image contract", () => {
  it("includes media and spacing attributes in GraphQL keys", () => {
    expect(getBlockAttributeKeys(imageDefinition.meta).sort()).toEqual(
      [
        "alt",
        "caption",
        "mediaHeight",
        "id",
        "linkUrl",
        "mediaWidth",
        "objectFit",
        "padding",
        "sizeSlug",
        "url",
      ].sort(),
    )
  })

  it("applies image defaults including spacing capability", () => {
    expect(applyAttributeDefaults(imageDefinition.meta, {})).toEqual({
      id: 0,
      url: "",
      alt: "",
      mediaWidth: 0,
      mediaHeight: 0,
      sizeSlug: "large",
      caption: "",
      objectFit: "cover",
      linkUrl: "",
      padding: "none",
    })
  })
})
