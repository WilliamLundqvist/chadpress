# Chadpress web (Next.js) — universal WordPress renderer

## WordPress + GraphQL

The app resolves the current URL as a WordPress URI and renders `editorBlocks` with **WPGraphQL Content Blocks** using component lookup from `@repo/ui`’s `blockRegistry` — the same `block.json` contracts as in `../../packages/ui/blocks/`.

- `/` maps to WordPress URI `/`.
- `/about` maps to WordPress URI `/about/`.
- `/blog/my-post` maps to WordPress URI `/blog/my-post/`.

Routing lives in `src/app/page.tsx` for `/` and `src/app/[...slug]/page.tsx` for every non-root path; both call `WpContentPage`, which queries `contentNode(id: $uri, idType: URI)`.

1. In DDEV, install and activate **WPGraphQL** and **WPGraphQL Content Blocks** (see your DDEV `bootstrap-plugins` host command or install manually, and [apps/wp-plugin/README.md](../wp-plugin/README.md)).
2. Create a published page/post with a **Heading** (core) block.
3. Copy `.env.local.example` to `.env.local` and set `WORDPRESS_GRAPHQL_URL` if your DDEV URL is not the default `https://chadpress.ddev.site/graphql`.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
```

## Block registry contract

Only blocks present in `packages/ui/blocks/registry.ts` (backed by each folder’s `block.json`) are rendered. Others show a small dev notice (development only) or are omitted in production. Future blocks should not require route changes: add a shadow declaration + component + registry entry in `packages/ui/blocks/`.

## Manual smoke test

- With DDEV and plugins running, `pnpm --filter web dev` and open `/`.
- Open a known WordPress URL like `/sample-page`.
- You should see the WordPress title and the same heading output as the shared `Heading` component (via GraphQL `attributes` + defaults from `block.json`).
