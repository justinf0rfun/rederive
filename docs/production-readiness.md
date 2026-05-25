# Production Readiness

Status: blocked on production Cloudflare resources and launch case approval.

Last local verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local D1 migrations through `0011_subscribers.sql`
- Remote D1 migrations applied to dev and prod; both report `schema_version=0011_subscribers`
- Local R2 write/read through social card generation
- Local Workflow binding type generation and Queue fallback dispatch tests
- Local hard QA gates through publish preflight and module review blockers
- Production deploy path is Cloudflare Workers Builds/Git integration using `pnpm run deploy:production` to deploy Worker `rederive`

Production resources to confirm:

- Cloudflare project/account for `rederive`.
- Production domain and route: `rederive.io`.
- D1 databases: `rederive-dev` (`8bd4c05f-0bd5-45ee-b05e-85e9cb3779d6`), `rederive-prod` (`07d829cd-dfc6-42d5-8d5a-ef60f45a66b0`).
- R2 buckets: `rederive-artifacts-dev`, `rederive-artifacts-prod`.
- Workflow resources: `rederive-generation-dev`, `rederive-generation-prod`.
- Queue fallback resources: `rederive-generation-dev`, `rederive-generation-prod`.
- Turnstile widget and secret for public topic, feedback, and subscribe forms.
- Cloudflare Access application protecting `/admin/*`.
- Allowed admin email or domain for `ALLOWED_ADMIN_EMAILS`.

Confirmed Cloudflare resources:

- D1 dev/prod databases are created and configured.
- D1 dev/prod remote migrations are applied through `0011_subscribers.sql`.
- R2 dev/prod buckets are created and configured.
- Queue fallback dev/prod resources are created and configured.
- Turnstile widget `rederive-public-forms` is created; site key is configured; `TURNSTILE_SECRET_KEY` is installed for default and production Workers.
- Production Worker is `rederive` with custom domain `rederive.io`; dev/test Worker is `rederive-dev` on the default Cloudflare `workers.dev` URL.
- Cloudflare Access application `rederive-admin-allow` protects `rederive.io/admin/*`; policy allows `mxtsing@gmail.com`.
- `ALLOWED_ADMIN_EMAILS` is configured as `mxtsing@gmail.com`.

Secrets and vars:

- `APP_ENV=production`.
- `AI_PROVIDER`, `SEARCH_PROVIDER`, `PAPER_SEARCH_PROVIDER` set to real provider names once adapters are implemented.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- Provider keys such as `OPENAI_API_KEY`, `SEARCH_API_KEY`, and `PAPER_SEARCH_API_KEY`.

Launch content:

- Approve first published case list.
- Seed benchmark case is available for demo validation but should not be treated as a real launch case unless explicitly approved.
- Every launch case must pass publish preflight, module approval, paper/design-doc coverage, claim-evidence validation, and immutable publication.

Deployment smoke test checklist:

1. Apply remote D1 migrations.
2. Deploy Worker.
3. Open `/health`.
4. Confirm `/admin` redirects through Cloudflare Access in production.
5. Submit a topic request with Turnstile.
6. Seed or publish a reviewed case.
7. Confirm `/zh/cases/:slug` and `/zh/cases/:slug/v/:id` render.
8. Confirm social card API returns the R2 asset.
9. Confirm subscribe and feedback submissions store rows.

Workers Builds settings:

- Install command: `pnpm install --frozen-lockfile`.
- Deploy command: `pnpm run deploy:production`.
- Production branch: `main`.
- Root directory: repository root.
