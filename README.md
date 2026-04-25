# Chadpress monorepo

Source for the **Next.js** app, **WordPress plugin**, and shared **@repo/ui** package. The WordPress/DDEV installation is **not** in this repository — keep it in a separate directory on your machine and mount these paths into the container (see [apps/wp-plugin/README.md](apps/wp-plugin/README.md)).

## Requirements

- Node.js 20+ (LTS recommended)
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`) so the pinned pnpm from `packageManager` is used

## One-time setup

```bash
git clone git@github.com:WilliamLundqvist/chadpress.git
cd chadpress
corepack enable
pnpm install
```

Optional: from the repo root, `pnpm run setup` runs `pnpm install` (handy in scripts or CI).

## Common commands

| Command | Purpose |
|--------|---------|
| `pnpm dev` | Start dev for all apps (Turbo) |
| `pnpm build` | Production build |
| `pnpm lint` | Lint |

App-scoped examples: `pnpm --filter web dev`, `pnpm --filter @repo/ui build:css`, `pnpm --filter wp-plugin build`.

## Local layout (WordPress beside the clone)

A typical setup places DDEV/WordPress next to this repository so bind mounts can use `..`:

```text
your-projects/
  chadpress/          ← this repository (monorepo root)
  wp/                 ← WordPress + .ddev (not in git; create separately)
```

Example DDEV `docker-compose.mounts.yaml` volume entries (paths relative to `wp/.ddev/`):

```yaml
- ../chadpress/apps/wp-plugin:/var/www/html/wp-content/plugins/chadpress-plugin
- ../chadpress/packages/ui:/var/www/html/wp-content/plugins/chadpress-plugin/chadpress-ui:cached
```

Adjust `chadpress` if your clone directory has another name. After changing mounts, `ddev restart` from the `wp` project.

## Environment (Next.js)

In `apps/web`, copy `.env.local.example` to `.env.local` and set `WORDPRESS_GRAPHQL_URL` to your DDEV GraphQL endpoint if it differs from the default.
