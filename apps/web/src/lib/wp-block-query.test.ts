import { describe, expect, it } from "vitest";

import {
  blockNameToGraphqlTypeName,
  normalizeEditorBlock,
  rebuildEditorBlockTree,
  toWordPressUri,
} from "./wp-block-query";

function flatBlock(
  name: string,
  clientId: string,
  parentClientId: string | null = null,
) {
  return {
    __typename: blockNameToGraphqlTypeName(name),
    name,
    clientId,
    parentClientId,
  };
}

describe("rebuildEditorBlockTree", () => {
  it("returns an empty array for null, undefined and empty input", () => {
    expect(rebuildEditorBlockTree(null)).toEqual([]);
    expect(rebuildEditorBlockTree(undefined)).toEqual([]);
    expect(rebuildEditorBlockTree([])).toEqual([]);
  });

  it("rebuilds nesting across three levels", () => {
    const tree = rebuildEditorBlockTree([
      flatBlock("chadpress/card", "card-1"),
      flatBlock("chadpress/card-header", "header-1", "card-1"),
      flatBlock("chadpress/card-title", "title-1", "header-1"),
    ]);

    expect(tree).toHaveLength(1);
    const card = tree[0]!;
    expect(card.clientId).toBe("card-1");
    expect(card.innerBlocks).toHaveLength(1);
    const header = card.innerBlocks[0]!;
    expect(header.clientId).toBe("header-1");
    expect(header.innerBlocks).toHaveLength(1);
    const title = header.innerBlocks[0]!;
    expect(title.clientId).toBe("title-1");
    expect(title.innerBlocks).toEqual([]);
  });

  it("treats blocks with an unknown parentClientId as roots", () => {
    const tree = rebuildEditorBlockTree([
      flatBlock("chadpress/text", "text-1", "does-not-exist"),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.clientId).toBe("text-1");
    expect(tree[0]!.innerBlocks).toEqual([]);
  });

  it("preserves sibling order for roots and inner blocks", () => {
    const tree = rebuildEditorBlockTree([
      flatBlock("chadpress/section", "section-1"),
      flatBlock("chadpress/text", "text-a", "section-1"),
      flatBlock("chadpress/text", "text-b", "section-1"),
      flatBlock("chadpress/text", "text-c", "section-1"),
      flatBlock("chadpress/heading", "heading-1"),
    ]);

    expect(tree.map((block) => block.clientId)).toEqual([
      "section-1",
      "heading-1",
    ]);
    expect(tree[0]!.innerBlocks.map((block) => block.clientId)).toEqual([
      "text-a",
      "text-b",
      "text-c",
    ]);
  });

  it("makes a self-parenting block a root instead of looping", () => {
    const tree = rebuildEditorBlockTree([
      flatBlock("chadpress/section", "loop-1", "loop-1"),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.clientId).toBe("loop-1");
    expect(tree[0]!.innerBlocks).toEqual([]);
  });
});

describe("blockNameToGraphqlTypeName", () => {
  it("converts a simple block name", () => {
    expect(blockNameToGraphqlTypeName("chadpress/heading")).toBe(
      "ChadpressHeading",
    );
  });

  it("converts hyphenated block names to PascalCase", () => {
    expect(blockNameToGraphqlTypeName("chadpress/card-title")).toBe(
      "ChadpressCardTitle",
    );
  });

  it("converts the image block name", () => {
    expect(blockNameToGraphqlTypeName("chadpress/image")).toBe("ChadpressImage");
  });
});

describe("normalizeEditorBlock", () => {
  it("applies image block defaults", () => {
    expect(normalizeEditorBlock("chadpress/image", { url: "https://example.com/a.jpg" })).toEqual({
      id: 0,
      url: "https://example.com/a.jpg",
      alt: "",
      mediaWidth: 0,
      mediaHeight: 0,
      sizeSlug: "large",
      caption: "",
      objectFit: "cover",
      linkUrl: "",
      padding: "none",
    });
  });
});

describe("toWordPressUri", () => {
  it("returns the root URI for undefined and empty input", () => {
    expect(toWordPressUri(undefined)).toBe("/");
    expect(toWordPressUri([])).toBe("/");
  });

  it("joins segments with a trailing slash", () => {
    expect(toWordPressUri(["about", "team"])).toBe("/about/team/");
  });

  it("URI-encodes segments", () => {
    expect(toWordPressUri(["about us", "caf\u00e9"])).toBe(
      "/about%20us/caf%C3%A9/",
    );
  });

  it("drops blank segments", () => {
    expect(toWordPressUri(["", "  ", "team", " about "])).toBe("/team/about/");
  });
});
