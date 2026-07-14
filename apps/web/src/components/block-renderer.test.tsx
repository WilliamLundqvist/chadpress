import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BlockRenderer } from "./block-renderer"
import type { WpEditorBlock } from "../lib/wp-block-query"

function block(
  name: string,
  attributes: Record<string, unknown>,
  innerBlocks: WpEditorBlock[] = [],
  clientId = crypto.randomUUID(),
): WpEditorBlock {
  return {
    name,
    clientId,
    parentClientId: null,
    attributes,
    innerBlocks,
  }
}

describe("BlockRenderer list semantics", () => {
  it("renders flat ul > li without wrapper divs between list and items", () => {
    const tree: WpEditorBlock[] = [
      block("chadpress/list", { ordered: false }, [
        block("chadpress/list-item", { content: "One" }),
        block("chadpress/list-item", { content: "Two" }),
      ]),
    ]

    const html = renderToStaticMarkup(<BlockRenderer blocks={tree} />)

    expect(html).toContain("<ul")
    expect(html).toContain("<li")
    expect(html).not.toMatch(/<ul[^>]*>[\s\S]*<div class="chadpress-block"/)
    expect(html).toContain("One")
    expect(html).toContain("Two")
  })

  it("renders nested lists with valid li > ul > li structure", () => {
    const tree: WpEditorBlock[] = [
      block("chadpress/list", { ordered: false }, [
        block("chadpress/list-item", { content: "Parent" }, [
          block("chadpress/list", { ordered: true }, [
            block("chadpress/list-item", { content: "Child" }),
          ]),
        ]),
      ]),
    ]

    const html = renderToStaticMarkup(<BlockRenderer blocks={tree} />)

    expect(html).toContain("<ul")
    expect(html).toContain("<ol")
    expect(html).toContain("Parent")
    expect(html).toContain("Child")
    expect(html).toMatch(/<li[^>]*>[\s\S]*<ol[^>]*>[\s\S]*<li/)
    expect(html).not.toMatch(/<li[^>]*>[\s\S]*<div class="chadpress-block"[\s\S]*<ol/)
  })

  it("renders ordered lists with ol", () => {
    const tree: WpEditorBlock[] = [
      block("chadpress/list", { ordered: true }, [
        block("chadpress/list-item", { content: "Step" }),
      ]),
    ]

    const html = renderToStaticMarkup(<BlockRenderer blocks={tree} />)
    expect(html).toContain("<ol")
    expect(html).toContain("Step")
  })
})
