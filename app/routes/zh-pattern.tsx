import { Link } from "react-router";

import { listLatestPublishedVersions } from "~/domain/publishing/repository.server";
import type { PublishedVersion } from "~/domain/publishing/types";
import type { Route } from "./+types/zh-pattern";

export async function loader({ context, params }: Route.LoaderArgs) {
  const versions = await listLatestPublishedVersions(
    context.cloudflare.env.DB,
    "zh",
    24
  );
  const matches = versions.filter(
    (version) => slugify(version.content.transferablePattern.name) === params.patternSlug
  );

  return {
    matches,
    patternSlug: params.patternSlug,
  };
}

export function meta({ data }: Route.MetaArgs) {
  const title =
    data?.matches[0]?.content.transferablePattern.name ||
    data?.patternSlug ||
    "pattern";
  return [{ title: `${title} - rederive` }];
}

export default function PatternPage({ loaderData }: Route.ComponentProps) {
  const { matches, patternSlug } = loaderData;
  const pattern = matches[0]?.content.transferablePattern;

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-8 text-zinc-950 md:px-8 lg:px-12">
      <article className="mx-auto max-w-[1200px]">
        <header className="border-b border-zinc-300 pb-10 pt-12 md:pt-20">
          <Link className="font-mono text-xs text-zinc-500" to="/zh">
            rederive
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
            transferable pattern
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-tight md:text-6xl">
            {pattern?.name || patternSlug}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-700">
            {pattern?.summary ||
              "这个模式还没有关联到已发布案例。发布案例后，机制、兄弟系统和边界会自动聚合到这里。"}
          </p>
        </header>

        {matches.length > 0 ? (
          <section className="grid gap-8 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                cases and boundaries
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                模式页必须同时呈现可迁移机制和反例边界，否则它只是口号。
              </p>
            </div>
            <div className="grid gap-6">
              {matches.map((version) => (
                <PatternCase key={version.id} version={version} />
              ))}
            </div>
          </section>
        ) : (
          <section className="py-12">
            <div className="border border-dashed border-zinc-300 bg-[#fbfaf6] p-5 text-sm leading-6 text-zinc-700">
              暂无已发布案例。模式聚合只来自已审核快照。
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

function PatternCase({ version }: { version: PublishedVersion }) {
  const pattern = version.content.transferablePattern;

  return (
    <section className="border-t border-zinc-300 pt-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            {version.content.topic.displayName}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            {pattern.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            {pattern.summary}
          </p>
        </div>
        <Link
          className="h-fit rounded-sm bg-zinc-950 px-4 py-2 text-center text-sm font-medium text-white transition active:translate-y-px"
          to={`/zh/cases/${version.content.topic.slug}#pattern`}
        >
          Open module
        </Link>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {pattern.siblings.map((sibling) => (
          <div className="border border-zinc-300 bg-[#fbfaf6] p-4" key={sibling.system}>
            <p className="font-medium text-zinc-950">{sibling.system}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {sibling.sameIdea}
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              {sibling.differentPrice}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {version.content.boundaries.map((boundary) => (
          <div className="border-l border-zinc-400 pl-4" key={boundary.counterexample}>
            <p className="font-medium text-zinc-950">{boundary.counterexample}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-700">
              {boundary.boundaryRule}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
