import {
  applyAttributeDefaults,
  blockRegistry,
  getBlockAttributeKeys,
  getBlockDefinition,
  isBlockName,
  type BlockName,
} from "@repo/ui/blocks";

import { fetchWordPressGraphql } from "./wordpress";

/**
 * `core/heading` → `CoreHeading` (matches WPGraphQL Content Blocks naming).
 */
export function blockNameToGraphqlTypeName(blockName: string): string {
  return blockName
    .split("/")
    .map((segment) =>
      segment
        .split(/[-_]/u)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(""),
    )
    .join("");
}

function buildBlockInlineFragments(): string {
  const names = Object.keys(blockRegistry) as BlockName[];
  return names
    .map((name) => {
      const gqType = blockNameToGraphqlTypeName(name);
      const entry = blockRegistry[name];
      const keys = getBlockAttributeKeys(entry.meta);
      if (keys.length === 0) {
        return "";
      }
      return `... on ${gqType} { attributes { ${keys.join(" ")} } }`;
    })
    .filter(Boolean)
    .join("\n");
}

const coreBlockLine = `
  __typename
  name
  renderedHtml
`;

/**
 * @param maxInnerDepth - how many nested `innerBlocks` levels to request (0 = no innerBlocks).
 */
function buildEditorBlockNode(maxInnerDepth: number): string {
  const frags = buildBlockInlineFragments();
  if (maxInnerDepth <= 0) {
    return `${coreBlockLine}
    ${frags}`.trim();
  }
  return `${coreBlockLine}
    ${frags}
    innerBlocks { ${buildEditorBlockNode(maxInnerDepth - 1)} }`;
}

/** Deeper tree for Group → Columns → Column → content and similar. */
const EDITOR_BLOCK_BODY = buildEditorBlockNode(4).trim();

export const CONTENT_NODE_BY_URI = /* GraphQL */ `
  query ContentNodeByUri($uri: ID!) {
    contentNode(id: $uri, idType: URI) {
      __typename
      id
      uri
      ... on Page {
        title
        editorBlocks(flat: false) {
          ${EDITOR_BLOCK_BODY}
        }
      }
      ... on Post {
        title
        editorBlocks(flat: false) {
          ${EDITOR_BLOCK_BODY}
        }
      }
    }
  }
`.trim();

export const LATEST_POST_WITH_BLOCKS = /* GraphQL */ `
  query LatestPostBlocks {
    posts(first: 1) {
      nodes {
        id
        title
        editorBlocks(flat: false) {
          ${EDITOR_BLOCK_BODY}
        }
      }
    }
  }
`.trim();

export type WpEditorBlock = {
  __typename: string;
  name: string;
  renderedHtml?: string | null;
  /** Present when a typed fragment (e.g. `CoreHeading`) is resolved. */
  attributes?: Record<string, unknown> | null;
  innerBlocks?: WpEditorBlock[] | null;
};

export type LatestPostBlocksData = {
  posts: {
    nodes: Array<{
      id: string;
      title: string | null;
      editorBlocks: WpEditorBlock[] | null;
    }> | null;
  } | null;
};

export type ContentNodeWithBlocks = {
  __typename: string;
  id: string;
  uri: string | null;
  title?: string | null;
  editorBlocks?: WpEditorBlock[] | null;
};

export type ContentNodeByUriData = {
  contentNode: ContentNodeWithBlocks | null;
};

export function toWordPressUri(slug?: string[]): string {
  if (!slug?.length) {
    return "/";
  }
  const normalized = slug
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `/${normalized}/`;
}

export function normalizeEditorBlock(
  name: string,
  attributes: Record<string, unknown> | null | undefined,
) {
  if (!isBlockName(name)) {
    return null;
  }
  const def = getBlockDefinition(name);
  if (!def) {
    return null;
  }
  return applyAttributeDefaults(def.meta, attributes) as Record<
    string,
    unknown
  >;
}

export async function getLatestPostWithBlocks() {
  return fetchWordPressGraphql<LatestPostBlocksData>(LATEST_POST_WITH_BLOCKS);
}

export async function getContentNodeByUri(uri: string) {
  return fetchWordPressGraphql<ContentNodeByUriData>(CONTENT_NODE_BY_URI, {
    uri,
  });
}
