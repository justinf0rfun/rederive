import { Form } from "react-router";

import { verifyTurnstileToken } from "~/domain/anti-abuse/turnstile.server";
import { createFeedbackItem } from "~/domain/feedback/repository.server";
import { validateFeedbackInput } from "~/domain/feedback/validation";
import { getPublishedVersionById } from "~/domain/publishing/repository.server";
import type { Route } from "./+types/zh-feedback";

export function meta({}: Route.MetaArgs) {
  return [{ title: "提交更正或来源 - rederive" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const versionId = url.searchParams.get("versionId");
  const moduleAnchor = url.searchParams.get("module") || "";
  const publishedVersion = versionId
    ? await getPublishedVersionById(context.cloudflare.env.DB, versionId)
    : null;

  return {
    moduleAnchor,
    publishedVersion,
    turnstileSiteKey: context.cloudflare.env.TURNSTILE_SITE_KEY,
  };
}

export async function action({ context, request }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  const validation = validateFeedbackInput({
    topicId: String(formData.get("topicId") || ""),
    publishedVersionId: String(formData.get("publishedVersionId") || ""),
    moduleAnchor: String(formData.get("moduleAnchor") || ""),
    feedbackType: String(formData.get("feedbackType") || ""),
    body: String(formData.get("body") || ""),
    sourceLinksText: String(formData.get("sourceLinksText") || ""),
    submitterEmail: String(formData.get("submitterEmail") || ""),
    turnstileToken: String(formData.get("cf-turnstile-response") || ""),
  });

  if (!validation.ok) {
    return { ok: false, fieldErrors: validation.fieldErrors };
  }

  let topicId = validation.value.topicId;
  if (validation.value.publishedVersionId) {
    const publishedVersion = await getPublishedVersionById(
      env.DB,
      validation.value.publishedVersionId
    );
    if (!publishedVersion) {
      return {
        ok: false,
        fieldErrors: { publishedVersionId: "关联的发布版本不存在。" },
      };
    }
    topicId = publishedVersion.topicId;
  }

  const turnstile = await verifyTurnstileToken(
    validation.value.turnstileToken,
    env,
    request.headers.get("CF-Connecting-IP")
  );
  if (!turnstile.ok) {
    return {
      ok: false,
      fieldErrors: { form: turnstile.error },
    };
  }

  const feedback = await createFeedbackItem(env.DB, {
    ...validation.value,
    topicId,
  });
  return { ok: true, feedbackId: feedback.id };
}

export default function FeedbackPage({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const version = loaderData.publishedVersion;
  const fieldErrors: Record<string, string> =
    actionData?.ok === false && actionData.fieldErrors
      ? actionData.fieldErrors
      : {};

  return (
    <main className="min-h-[100dvh] bg-[#f5f4ef] px-4 py-8 text-zinc-950 md:px-8 lg:px-12">
      <section className="mx-auto max-w-3xl pt-12 md:pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">
          correction and source feedback
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          提交结构化更正或补充来源
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-700">
          反馈会绑定到已发布版本和模块锚点，进入后台审核。这里不是评论区，只收事实更正、缺失来源、弱推理和模块理解问题。
        </p>

        {actionData?.ok && (
          <p className="mt-6 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            已收到反馈：<span className="font-mono">{actionData.feedbackId}</span>
          </p>
        )}
        {fieldErrors.form && (
          <p className="mt-6 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {fieldErrors.form}
          </p>
        )}

        <Form className="mt-8 grid gap-5" method="post">
          <input name="topicId" type="hidden" value={version?.topicId || ""} />
          <input
            name="publishedVersionId"
            type="hidden"
            value={version?.id || ""}
          />
          <label className="grid gap-2">
            <span className="text-sm font-medium">关联案例</span>
            <input
              className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950"
              readOnly
              value={
                version
                  ? `${version.content.topic.displayName} v${version.versionNumber}`
                  : "未绑定具体案例"
              }
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">模块锚点</span>
            <input
              className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              defaultValue={loaderData.moduleAnchor}
              name="moduleAnchor"
              placeholder="stage-2 / debt-map / sources"
            />
            {fieldErrors.moduleAnchor && (
              <span className="text-sm text-red-800">
                {fieldErrors.moduleAnchor}
              </span>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">反馈类型</span>
            <select
              className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              name="feedbackType"
            >
              <option value="factual_correction">事实更正</option>
              <option value="missing_source">补充来源</option>
              <option value="weak_inference">推理过强</option>
              <option value="module_confusing">模块难以理解</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">说明</span>
            <textarea
              className="min-h-36 rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              name="body"
              placeholder="指出具体句子、模块或缺失资料。"
            />
            {fieldErrors.body && (
              <span className="text-sm text-red-800">
                {fieldErrors.body}
              </span>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">参考链接</span>
            <textarea
              className="min-h-24 rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              name="sourceLinksText"
              placeholder="每行或空格分隔一个 URL。"
            />
            {fieldErrors.sourceLinksText && (
              <span className="text-sm text-red-800">
                {fieldErrors.sourceLinksText}
              </span>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">邮箱，可选</span>
            <input
              className="rounded-sm border border-zinc-300 bg-[#fbfaf6] px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              name="submitterEmail"
              placeholder="you@example.com"
              type="email"
            />
            {fieldErrors.submitterEmail && (
              <span className="text-sm text-red-800">
                {fieldErrors.submitterEmail}
              </span>
            )}
          </label>
          {loaderData.turnstileSiteKey && (
            <input name="cf-turnstile-response" type="hidden" value="" />
          )}
          <button
            className="w-fit rounded-sm bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px"
            type="submit"
          >
            提交反馈
          </button>
        </Form>
      </section>
    </main>
  );
}
