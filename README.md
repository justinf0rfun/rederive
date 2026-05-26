# rederive

Cloudflare-backed website for publishing and reviewing structured `redo` cases.

`rederive` is the site and parent brand. `redo` is the core content format and generation contract.

## Required Reading

- `AGENTS.md`
- `docs/redo-site-prd-architecture.md`
- `docs/redo-site-ui-interaction-spec.md`
- `docs/implementation-issues.md`

## Stack

- React Router v7 / Remix-style routing
- Cloudflare Workers runtime
- Cloudflare D1 for workflow state and published JSON snapshots
- Cloudflare R2 for source snapshots and generated social cards
- Cloudflare Workflows for durable generation orchestration, with Queue retained as a compatibility fallback
- Cloudflare Access for `/admin` and `/admin/*`
- Cloudflare Turnstile for public forms
- `pnpm` for package management

## Local Setup

Install dependencies:

```sh
pnpm install
```

Generate Cloudflare runtime types:

```sh
pnpm run cf-typegen
```

Apply the local D1 migration:

```sh
pnpm wrangler d1 migrations apply DB --local
```

Start the development server:

```sh
pnpm run dev
```

Useful routes:

- `http://localhost:5173/zh`
- `http://localhost:5173/admin`
- `http://localhost:5173/health`

## Verification

```sh
pnpm run typecheck
pnpm run build
pnpm run test
```

## Cloudflare Workers Builds

Use Cloudflare Workers Git integration for automatic production deploys from GitHub.

Recommended settings:

- Framework preset: none/custom
- Install command: `pnpm install --frozen-lockfile`
- Deploy command: `pnpm run deploy:production`
- Production branch: `main`
- Root directory: repository root

`deploy:production` runs typecheck, tests, production build, remote production D1 migrations, then `wrangler deploy`. The top-level Wrangler config is production and deploys the Worker named `rederive` to `rederive.io`. `env.production` mirrors that production target so Cloudflare Builds commands that use `-e production` are also safe. The optional `dev` Wrangler environment deploys the `rederive-dev` workers.dev test Worker. Wrangler skips the D1 migration confirmation prompt in CI/CD.

## Cloudflare Resources

Production resource IDs are not committed. Fill these into `wrangler.jsonc` or environment-specific config when created:

- D1 database: `rederive-dev` (`8bd4c05f-0bd5-45ee-b05e-85e9cb3779d6`) / `rederive-prod` (`07d829cd-dfc6-42d5-8d5a-ef60f45a66b0`)
- R2 bucket: `rederive-artifacts-dev` / `rederive-artifacts-prod`
- Workflow: `rederive-generation-dev` / `rederive-generation-prod`
- Queue fallback: `rederive-generation-dev` / `rederive-generation-prod`
- Turnstile widget: `rederive-public-forms`
- Production domain: `rederive.io`
- Dev/staging: default Cloudflare `workers.dev` URL
- Access app: protect `/admin` and `/admin/*`
- Provider secrets: `OPENAI_API_KEY`, `SEARCH_API_KEY`, `PAPER_SEARCH_API_KEY`
- Production Worker: `rederive`
- Dev/test Worker: `rederive-dev` on the default Cloudflare `workers.dev` URL
