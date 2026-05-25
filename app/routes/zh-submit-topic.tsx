import { Form, Link } from "react-router";

import { verifyTurnstileToken } from "~/domain/anti-abuse/turnstile.server";
import { createTopicRequest } from "~/domain/topic-requests/repository.server";
import { validateTopicRequestInput } from "~/domain/topic-requests/validation";
import type { Route } from "./+types/zh-submit-topic";

type ActionData =
  | {
      ok: true;
      requestId: string;
      topicText: string;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      formError?: string;
      values: Record<string, string>;
    };

export function meta({}: Route.MetaArgs) {
  return [
    { title: "提交想看的技术 - redo by rederive" },
    {
      name: "description",
      content: "提交你想让 redo 分析的技术主题和参考资料。",
    },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return {
    turnstileSiteKey: context.cloudflare.env.TURNSTILE_SITE_KEY,
    appEnv: context.cloudflare.env.APP_ENV,
  };
}

export async function action({
  context,
  request,
}: Route.ActionArgs): Promise<ActionData> {
  const formData = await request.formData();
  const values = {
    topicText: String(formData.get("topicText") || ""),
    reason: String(formData.get("reason") || ""),
    submitterEmail: String(formData.get("submitterEmail") || ""),
    sourceLinksText: String(formData.get("sourceLinksText") || ""),
    turnstileToken: String(formData.get("cf-turnstile-response") || ""),
  };

  const validation = validateTopicRequestInput({
    ...values,
    locale: "zh",
  });

  if (!validation.ok) {
    return { ok: false, fieldErrors: validation.fieldErrors, values };
  }

  const remoteIp = request.headers.get("CF-Connecting-IP");
  const turnstile = await verifyTurnstileToken(
    validation.value.turnstileToken,
    context.cloudflare.env,
    remoteIp
  );

  if (!turnstile.ok) {
    return {
      ok: false,
      fieldErrors: {},
      formError: "验证失败，请刷新后重试。",
      values,
    };
  }

  const created = await createTopicRequest(context.cloudflare.env.DB, validation.value, {
    turnstileBypassed: turnstile.bypassed,
    remoteIpPresent: Boolean(remoteIp),
    userAgent: request.headers.get("User-Agent") || null,
  });

  return { ok: true, requestId: created.id, topicText: created.topicText };
}

export default function SubmitTopic({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const failed = actionData && !actionData.ok ? actionData : null;
  const succeeded = actionData && actionData.ok ? actionData : null;
  const values = failed?.values ?? {};

  return (
    <main className="min-h-[100dvh] px-5 py-8 text-zinc-950 md:px-10 lg:px-16">
      <section className="mx-auto grid max-w-6xl gap-10 pt-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,1fr)] lg:pt-24">
        <div>
          <Link
            className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-900"
            to="/zh"
          >
            redo by rederive
          </Link>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-950 md:text-5xl">
            提交你想 redo 的技术。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-zinc-600">
            这里不是公开投票榜。提交会进入后台候选池，后续由管理员筛选、生成草稿并审核发布。
          </p>
          <div className="mt-8 rounded-xl border border-zinc-300/80 bg-white/60 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
              intake rules
            </p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-zinc-600">
              <li>主题尽量具体，例如 Kafka、React Server Components、D1。</li>
              <li>参考资料可以是论文、设计文档、RFC、release notes。</li>
              <li>第一版只收集需求，不公开展示排队列表。</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-300/80 bg-white/75 p-5 shadow-[0_24px_80px_-48px_rgba(39,39,42,0.55)] md:p-6">
          {succeeded ? (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
                submitted
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                已收到：{succeeded.topicText}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                它已经进入后台候选池。管理员后续可以从这里创建生成任务。
              </p>
              <p className="mt-4 font-mono text-xs text-zinc-500">
                request id: {succeeded.requestId}
              </p>
              <Link
                className="mt-6 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
                to="/zh/submit-topic"
              >
                再提交一个
              </Link>
            </div>
          ) : (
            <Form className="grid gap-5" method="post">
              {failed?.formError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {failed.formError}
                </p>
              )}

              <Field
                error={failed?.fieldErrors.topicText}
                helper="例如 Kafka、Docker、PostgreSQL、React Server Components。"
                label="技术主题"
              >
                <input
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                  defaultValue={values.topicText}
                  maxLength={120}
                  name="topicText"
                  required
                />
              </Field>

              <Field
                error={failed?.fieldErrors.reason}
                helper="可选。说清楚你为什么想看，有助于判断分析角度。"
                label="为什么想看"
              >
                <textarea
                  className="min-h-32 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-base leading-7 outline-none transition focus:border-zinc-950"
                  defaultValue={values.reason}
                  maxLength={1200}
                  name="reason"
                />
              </Field>

              <Field
                error={failed?.fieldErrors.sourceLinksText}
                helper="可选。每行或空格分隔，最多 8 个链接。优先论文、设计文档、RFC、官方文档。"
                label="参考资料链接"
              >
                <textarea
                  className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-6 outline-none transition focus:border-zinc-950"
                  defaultValue={values.sourceLinksText}
                  maxLength={2000}
                  name="sourceLinksText"
                />
              </Field>

              <Field
                error={failed?.fieldErrors.submitterEmail}
                helper="可选。后续如果这个主题发布，可以通知你。"
                label="邮箱"
              >
                <input
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                  defaultValue={values.submitterEmail}
                  maxLength={254}
                  name="submitterEmail"
                  type="email"
                />
              </Field>

              {String(loaderData.appEnv) === "production" ? (
                <>
                  <script
                    async
                    defer
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                  />
                  <div
                    className="cf-turnstile"
                    data-sitekey={loaderData.turnstileSiteKey}
                  />
                </>
              ) : (
                <input name="cf-turnstile-response" type="hidden" value="dev" />
              )}

              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
                type="submit"
              >
                提交主题
              </button>
            </Form>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  children,
  error,
  helper,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  helper: string;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-950">{label}</span>
      {children}
      <span className="text-xs leading-5 text-zinc-500">{helper}</span>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </label>
  );
}
