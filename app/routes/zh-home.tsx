import { Form, Link } from "react-router";

import { listLatestPublishedVersions } from "~/domain/publishing/repository.server";
import type { PublishedVersion } from "~/domain/publishing/types";
import { subscribeEmail } from "~/domain/subscribers/repository.server";
import { validateSubscriberEmail } from "~/domain/subscribers/validation";
import type { Route } from "./+types/zh-home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "redo by rederive" },
    {
      name: "description",
      content: "用工程约束重走成熟技术的演化路径。",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const publishedVersions = await listLatestPublishedVersions(
    context.cloudflare.env.DB,
    "zh",
    8
  );

  return {
    designQuestions: collectDesignQuestions(publishedVersions).slice(0, 6),
    featuredCases: publishedVersions.slice(0, 6),
    modulePreview: publishedVersions[0] || null,
    patterns: collectPatterns(publishedVersions).slice(0, 4),
  };
}

export async function action({ context, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  if (intent !== "subscribe") {
    throw new Response("Unsupported action", { status: 400 });
  }

  const email = String(formData.get("email") || "");
  const emailError = validateSubscriberEmail(email);
  if (emailError) {
    return { ok: false, fieldErrors: { email: emailError } };
  }

  const result = await subscribeEmail(context.cloudflare.env.DB, {
    email,
    locale: "zh",
  });

  return { ok: true, subscribeStatus: result.status };
}

export default function ZhHome({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const { designQuestions, featuredCases, modulePreview, patterns } = loaderData;
  const fieldErrors: Record<string, string> =
    actionData?.ok === false && actionData.fieldErrors
      ? actionData.fieldErrors
      : {};

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-8 text-zinc-950 md:px-8 lg:px-12">
      <section className="mx-auto max-w-[1400px] border-b border-zinc-300 pb-12 pt-12 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
              redo by rederive
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
              不是教程，不是时间线，是把成熟系统重新推导一遍。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-700 md:text-lg">
              rederive 把一个系统拆成约束、候选方案、取舍、技术债、修复路径和仍未解决的痛点。读者看到的不是功能清单，而是工程判断如何被条件塑形。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-sm bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
                to={featuredCases[0] ? `/zh/cases/${featuredCases[0].content.topic.slug}` : "/zh/submit-topic"}
              >
                阅读最新案例
              </Link>
              <Link
                className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-4 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
                to="/zh/method"
              >
                查看方法
              </Link>
              <Link
                className="rounded-sm border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
                to="/zh/submit-topic"
              >
                提交想看的技术
              </Link>
            </div>
          </div>
          <QuestionStack questions={designQuestions.slice(0, 3)} />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 border-b border-zinc-300 py-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionIntro
          label="design questions"
          title="先从问题进入系统"
          body="每个 redo 案例都可以被拆成若干设计问题。问题页会把相关案例和具体模块串起来。"
        />
        {designQuestions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {designQuestions.map((question) => (
              <Link
                className="group border border-zinc-300 bg-[#fbfaf6] p-4 transition hover:border-zinc-500 active:translate-y-px"
                key={question.slug}
                to={`/zh/questions/${question.slug}`}
              >
                <p className="font-mono text-xs text-zinc-500">
                  {question.caseCount} cases · {question.moduleCount} modules
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-zinc-950">
                  {question.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {question.summary}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="还没有已发布案例。发布第一篇 redo 后，这里会自动出现可追踪的设计问题。" />
        )}
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 border-b border-zinc-300 py-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionIntro
          label="featured cases"
          title="已审核案例"
          body="这里仅展示已经通过硬 QA、模块审核和不可变发布的内容。"
        />
        {featuredCases.length > 0 ? (
          <div className="grid gap-4">
            {featuredCases.map((version) => (
              <Link
                className="grid gap-4 border-t border-zinc-300 pt-5 transition hover:border-zinc-500 md:grid-cols-[minmax(0,1fr)_220px]"
                key={version.id}
                to={`/zh/cases/${version.content.topic.slug}`}
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
                    v{version.versionNumber} · {version.publishedAt.slice(0, 10)}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    {version.content.topic.displayName}
                  </h3>
                  <p className="mt-2 max-w-[70ch] text-sm leading-6 text-zinc-700">
                    {version.content.orientation.oneSentenceVersion}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 font-mono text-xs text-zinc-600 md:grid-cols-1">
                  <CaseMetric label="sources" value={version.content.trust.sourceCount} />
                  <CaseMetric label="claims" value={version.content.trust.claimCount} />
                  <CaseMetric label="stages" value={version.content.stages.length} />
                </dl>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="没有已发布案例。后台发布后，首页会从 published_versions 自动渲染案例列表。" />
        )}
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 border-b border-zinc-300 py-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionIntro
          label="signature modules"
          title="读一个案例时应该抓住的三块"
          body="债务图、痛点排行、因果链会把阶段选择变成可迁移的工程判断。"
        />
        {modulePreview ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <PreviewPanel
              label="debt map"
              title={`${modulePreview.content.debtMap.resolved.length} resolved · ${modulePreview.content.debtMap.mitigated.length} mitigated · ${modulePreview.content.debtMap.unresolved.length} unresolved`}
              body={modulePreview.content.debtMap.unresolved[0]?.currentManifestation || modulePreview.content.debtMap.mitigated[0]?.whatRemains || "Debt map is available in the case."}
              to={`/zh/cases/${modulePreview.content.topic.slug}#debt-map`}
            />
            <div className="grid gap-4">
              <PreviewPanel
                label="pain ranking"
                title={modulePreview.content.painRanking[0]?.painPoint || "Pain ranking"}
                body={modulePreview.content.painRanking[0]?.oneLineExplanation || "Current symptoms appear after publish."}
                to={`/zh/cases/${modulePreview.content.topic.slug}#pain-ranking`}
              />
              <PreviewPanel
                label="causal chain"
                title={modulePreview.content.causalChain.oneSentenceVersion}
                body={modulePreview.content.causalChain.story}
                to={`/zh/cases/${modulePreview.content.topic.slug}#causal-chain`}
              />
            </div>
          </div>
        ) : (
          <EmptyState text="发布案例后，这里会展示可分享的模块预览。" />
        )}
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 py-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionIntro
          label="patterns"
          title="模式必须有边界"
          body="模式页从已发布案例中聚合可迁移机制，同时保留反例和适用边界。"
        />
        {patterns.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {patterns.map((pattern) => (
              <Link
                className="border border-zinc-300 bg-[#fbfaf6] p-4 transition hover:border-zinc-500 active:translate-y-px"
                key={pattern.slug}
                to={`/zh/patterns/${pattern.slug}`}
              >
                <p className="font-mono text-xs text-zinc-500">
                  {pattern.caseCount} cases
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight">
                  {pattern.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {pattern.summary}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="模式会从已发布案例自动聚合，不会手工编造。" />
        )}
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 border-t border-zinc-300 py-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionIntro
          label="subscribe"
          title="只收已审核内容"
          body="订阅只记录邮箱和语言，不绑定具体邮件服务。后续 provider adapter 会从 D1 subscriber 状态同步。"
        />
        <Form className="grid max-w-xl gap-3" method="post">
          <input name="intent" type="hidden" value="subscribe" />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-950">邮箱</span>
            <input
              className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              name="email"
              placeholder="you@example.com"
              type="email"
            />
            {fieldErrors.email && (
              <span className="text-sm text-red-800">{fieldErrors.email}</span>
            )}
          </label>
          {actionData?.ok && (
            <p className="text-sm text-emerald-800">
              {actionData.subscribeStatus === "duplicate"
                ? "这个邮箱已经订阅。"
                : "订阅已记录。"}
            </p>
          )}
          <button
            className="w-fit rounded-sm bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
            type="submit"
          >
            订阅发布更新
          </button>
        </Form>
      </section>
    </main>
  );
}

function QuestionStack({
  questions,
}: {
  questions: Array<ReturnType<typeof collectDesignQuestions>[number]>;
}) {
  if (questions.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 bg-[#fbfaf6] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
          waiting for published cases
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-700">
          第一篇案例发布后，这里会展示可点击的设计问题。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {questions.map((question, index) => (
        <Link
          className="border border-zinc-300 bg-[#fbfaf6] p-4 transition hover:border-zinc-500 active:translate-y-px"
          key={question.slug}
          style={{ transform: `translateX(${index * 14}px)` }}
          to={`/zh/questions/${question.slug}`}
        >
          <p className="font-mono text-xs text-zinc-500">
            question {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-3 text-lg font-medium leading-6">{question.title}</p>
        </Link>
      ))}
    </div>
  );
}

function SectionIntro({
  body,
  label,
  title,
}: {
  body: string;
  label: string;
  title: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{body}</p>
    </div>
  );
}

function CaseMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-zinc-300 pl-3">
      <dt className="uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-950">{value}</dd>
    </div>
  );
}

function PreviewPanel({
  body,
  label,
  title,
  to,
}: {
  body: string;
  label: string;
  title: string;
  to: string;
}) {
  return (
    <Link
      className="block border border-zinc-300 bg-[#fbfaf6] p-5 transition hover:border-zinc-500 active:translate-y-px"
      to={to}
    >
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700">
        {body}
      </p>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-zinc-300 bg-[#fbfaf6] p-5 text-sm leading-6 text-zinc-600">
      {text}
    </div>
  );
}

function collectDesignQuestions(versions: PublishedVersion[]) {
  const map = new Map<
    string,
    { caseCount: number; moduleCount: number; slug: string; summary: string; title: string }
  >();

  for (const version of versions) {
    for (const question of version.content.designQuestions) {
      const current = map.get(question.slug);
      map.set(question.slug, {
        caseCount: (current?.caseCount || 0) + 1,
        moduleCount: (current?.moduleCount || 0) + 1,
        slug: question.slug,
        summary: question.summary,
        title: question.title,
      });
    }
  }

  return Array.from(map.values());
}

function collectPatterns(versions: PublishedVersion[]) {
  const map = new Map<
    string,
    { caseCount: number; name: string; slug: string; summary: string }
  >();

  for (const version of versions) {
    const pattern = version.content.transferablePattern;
    const slug = slugify(pattern.name);
    const current = map.get(slug);
    map.set(slug, {
      caseCount: (current?.caseCount || 0) + 1,
      name: pattern.name,
      slug,
      summary: pattern.summary,
    });
  }

  return Array.from(map.values());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
