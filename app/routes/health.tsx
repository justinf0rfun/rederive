import { Form } from "react-router";

import { readMigrationStatus, writeHealthCheck } from "~/lib/db.server";
import type { Route } from "./+types/health";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Health - rederive" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const migration = await readMigrationStatus(env.DB);

  return {
    app: "rederive",
    appEnv: env.APP_ENV,
    migration,
    bindings: {
      d1: Boolean(env.DB),
      r2: Boolean(env.ARTIFACTS),
      generationWorkflow: Boolean(env.GENERATION_WORKFLOW),
      generationQueue: Boolean(env.GENERATION_QUEUE),
      turnstile: Boolean(env.TURNSTILE_SITE_KEY),
    },
  };
}

export async function action({ context }: Route.ActionArgs) {
  await writeHealthCheck(context.cloudflare.env.DB);
  return { ok: true, wroteAt: new Date().toISOString() };
}

export default function Health({ loaderData, actionData }: Route.ComponentProps) {
  const migration = loaderData.migration;

  return (
    <main className="min-h-[100dvh] px-5 py-8 md:px-10 lg:px-16">
      <section className="mx-auto max-w-4xl pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
          health
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950">
          Runtime and binding check
        </h1>

        <div className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">App environment</dt>
              <dd className="font-mono">{loaderData.appEnv}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">D1 migration</dt>
              <dd className="font-mono">
                {migration.ok ? migration.schemaVersion : migration.error}
              </dd>
            </div>
            {Object.entries(loaderData.bindings).map(([key, value]) => (
              <div className="flex items-center justify-between gap-4" key={key}>
                <dt className="text-zinc-500">{key}</dt>
                <dd className="font-mono">{value ? "bound" : "missing"}</dd>
              </div>
            ))}
          </dl>

          <Form method="post" className="mt-6">
            <button
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
              type="submit"
            >
              Write health timestamp
            </button>
          </Form>

          {actionData?.ok && (
            <p className="mt-4 font-mono text-sm text-emerald-800">
              wrote at {actionData.wroteAt}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
