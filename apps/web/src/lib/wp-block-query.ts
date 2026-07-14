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
 * `chadpress/heading` → `ChadpressHeading` (matches WPGraphQL Content Blocks naming).
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

const BLOCK_ATTRIBUTE_FRAGMENTS = buildBlockInlineFragments();

export const CONTENT_NODE_BY_URI = /* GraphQL */ `
  query ContentNodeByUri($uri: ID!) {
    contentNode(id: $uri, idType: URI) {
      __typename
      id
      uri
      ... on Page {
        title
        editorBlocks(flat: true) {
          ...EditorBlockFields
        }
      }
      ... on Post {
        title
        editorBlocks(flat: true) {
          ...EditorBlockFields
        }
      }
    }
  }
  fragment EditorBlockFields on EditorBlock {
    __typename
    name
    clientId
    parentClientId
    ${BLOCK_ATTRIBUTE_FRAGMENTS}
  }
`.trim();

type FlatWpEditorBlock = {
  __typename: string;
  name: string;
  clientId: string;
  parentClientId: string | null;
  /** Present when a typed fragment (e.g. `CoreHeading`) is resolved. */
  attributes?: Record<string, unknown> | null;
};

export type WpEditorBlock = FlatWpEditorBlock & {
  innerBlocks: WpEditorBlock[];
};

export function rebuildEditorBlockTree(
  blocks: FlatWpEditorBlock[] | null | undefined,
): WpEditorBlock[] {
  if (!blocks?.length) {
    return [];
  }

  const rebuilt = blocks.map(
    (block): WpEditorBlock => ({ ...block, innerBlocks: [] }),
  );
  const blocksByClientId = new Map(
    rebuilt.map((block) => [block.clientId, block]),
  );
  const roots: WpEditorBlock[] = [];

  for (const block of rebuilt) {
    const parent = block.parentClientId
      ? blocksByClientId.get(block.parentClientId)
      : undefined;

    if (parent && parent !== block) {
      parent.innerBlocks.push(block);
    } else {
      roots.push(block);
    }
  }

  return roots;
}

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

type FlatContentNodeByUriData = {
  contentNode:
    | (Omit<ContentNodeWithBlocks, "editorBlocks"> & {
        editorBlocks?: FlatWpEditorBlock[] | null;
      })
    | null;
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

export async function getContentNodeByUri(
  uri: string,
): Promise<ContentNodeByUriData> {
  const data = await fetchWordPressGraphql<FlatContentNodeByUriData>(
    CONTENT_NODE_BY_URI,
    {
      uri,
    },
  );

  if (!data.contentNode) {
    return data as ContentNodeByUriData;
  }

  return {
    ...data,
    contentNode: {
      ...data.contentNode,
      editorBlocks: rebuildEditorBlockTree(data.contentNode.editorBlocks),
    },
  } satisfies ContentNodeByUriData;
}
