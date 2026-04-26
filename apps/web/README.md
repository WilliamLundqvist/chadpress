# apps/web — Next.js renderer

Renders WordPress pages by URI: `contentNode(id: $uri, idType: URI)` and `editorBlocks`, using the same `block.json` contracts as `packages/ui/blocks/` via `blockRegistry`.

## Prerequisites

- Running WordPress with **WPGraphQL** and **WPGraphQL Content Blocks** active  
  (see [../wp-plugin/README.md](../wp-plugin/README.md) for DDEV mounts and `bootstrap-plugins`.)

## Environment

Copy `.env.local.example` to `.env.local`.

- **`WORDPRESS_GRAPHQL_URL`** — full URL to the GraphQL endpoint (e.g. `https://your-site.ddev.site/graphql`).
- **Important:** this URL is called from **Node** during SSR/RSC. If the browser can open DDEV but `pnpm dev` shows `fetch failed`, use a URL that resolves from your dev machine (try `http://`, `127.0.0.1` + port from `ddev describe`, or `host.docker.internal` depending on setup). The error page in development lists attempts and hints.

## Routing

| App path | WordPress URI (typical) |
|----------|-------------------------|
| `/` | `/` |
| `/about` | `/about/` |
| `/blog/post` | `/blog/post/` |

Implemented in `src/app/page.tsx` and `src/app/[...slug]/page.tsx`, both using `WpContentPage`.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
```

## Blocks

Only blocks registered in `packages/ui/blocks` / `blockRegistry` render with a component; others may show a dev-only notice. See [../../packages/ui/blocks/README.md](../../packages/ui/blocks/README.md). Query shape: `src/lib/wp-block-query.ts`.

## Smoke test

1. `pnpm --filter @repo/ui build:css` and `pnpm --filter wp-plugin build` if you changed UI or the editor bundle.
2. Set `.env.local` so GraphQL works from the shell running `pnpm dev` (try `curl -X POST` with a minimal query if unsure).
3. `pnpm --filter web dev` → open `/` and a known page slug.
