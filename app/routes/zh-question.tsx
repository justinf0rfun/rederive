import { Link } from "react-router";

import { listLatestPublishedVersions } from "~/domain/publishing/repository.server";
import type { PublishedVersion } from "~/domain/publishing/types";
import type { Route } from "./+types/zh-question";

export async function loader({ context, params }: Route.LoaderArgs) {
  const versions = await listLatestPublishedVersions(
    context.cloudflare.env.DB,
    "zh",
    24
  );
  const matches = versions.flatMap((version) =>
    version.content.designQuestions
      .filter((question) => question.slug === params.questionSlug)
      .map((question) => ({ question, version }))
  );

  return {
    matches,
    questionSlug: params.questionSlug,
  };
}

export function meta({ data }: Route.MetaArgs) {
  const title = data?.matches[0]?.question.title || data?.questionSlug || "question";
  return [{ title: `${title} - rederive` }];
}

export default function QuestionPage({ loaderData }: Route.ComponentProps) {
  const { matches, questionSlug } = loaderData;
  const title = matches[0]?.question.title || questionSlug;
  const summary =
    matches[0]?.question.summary ||
    "这个问题还没有关联到已发布案例。发布新案例后，相关模块会自动出现在这里。";

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-8 text-zinc-950 md:px-8 lg:px-12">
      <article className="mx-auto max-w-[1200px]">
        <header className="border-b border-zinc-300 pb-10 pt-12 md:pt-20">
          <Link className="font-mono text-xs text-zinc-500" to="/zh">
            rederive
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
            design question
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-700">
            {summary}
          </p>
        </header>

        {matches.length > 0 ? (
          <section className="grid gap-8 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                related modules
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                问题页链接到案例中的阶段模块，而不是只给一组文章标题。
              </p>
            </div>
            <div className="grid gap-4">
              {matches.map(({ question, version }) => (
                <CaseQuestionHit
                  key={`${version.id}-${question.slug}`}
                  question={question}
                  version={version}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="py-12">
            <div className="border border-dashed border-zinc-300 bg-[#fbfaf6] p-5 text-sm leading-6 text-zinc-700">
              暂无已发布案例。你可以提交这个问题对应的技术系统，后台生成和审核后会自动建立关联。
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

function CaseQuestionHit({
  question,
  version,
}: {
  question: PublishedVersion["content"]["designQuestions"][number];
  version: PublishedVersion;
}) {
  const stage = version.content.stages.find((candidate) => candidate.slug === question.slug);

  return (
    <Link
      className="grid gap-4 border-t border-zinc-300 pt-5 transition hover:border-zinc-500 md:grid-cols-[minmax(0,1fr)_180px]"
      to={`/zh/cases/${version.content.topic.slug}#${stage?.id || question.slug}`}
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
          {version.content.topic.displayName}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          {question.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          {question.summary}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 font-mono text-xs text-zinc-600 md:grid-cols-1">
        <Metric label="version" value={`v${version.versionNumber}`} />
        <Metric label="sources" value={String(version.content.trust.sourceCount)} />
        <Metric label="claims" value={String(version.content.trust.claimCount)} />
      </dl>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-zinc-300 pl-3">
      <dt className="uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-950">{value}</dd>
    </div>
  );
}
