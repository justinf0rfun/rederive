import { parseSourceLinks } from "~/domain/topic-requests/validation";
import type {
  FeedbackInput,
  FeedbackType,
  FeedbackValidationResult,
} from "./types";

const FEEDBACK_TYPES: FeedbackType[] = [
  "factual_correction",
  "missing_source",
  "weak_inference",
  "module_confusing",
  "other",
];
const MAX_BODY_LENGTH = 2_000;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_LINKS = 8;
const MAX_SOURCE_LINKS_TEXT_LENGTH = 2_000;
const MAX_MODULE_ANCHOR_LENGTH = 120;

export function validateFeedbackInput(
  input: FeedbackInput
): FeedbackValidationResult {
  const fieldErrors: Record<string, string> = {};
  const body = input.body.trim();
  const submitterEmail = input.submitterEmail.trim();
  const sourceLinksText = input.sourceLinksText.trim();
  const sourceLinks = parseSourceLinks(sourceLinksText);
  const moduleAnchor = input.moduleAnchor?.trim() || null;

  if (!FEEDBACK_TYPES.includes(input.feedbackType as FeedbackType)) {
    fieldErrors.feedbackType = "请选择反馈类型。";
  }

  if (body.length === 0) {
    fieldErrors.body = "请描述需要更正或补充的内容。";
  } else if (body.length > MAX_BODY_LENGTH) {
    fieldErrors.body = `反馈不能超过 ${MAX_BODY_LENGTH} 个字符。`;
  }

  if (moduleAnchor && moduleAnchor.length > MAX_MODULE_ANCHOR_LENGTH) {
    fieldErrors.moduleAnchor = "模块锚点太长。";
  }

  if (submitterEmail.length > MAX_EMAIL_LENGTH) {
    fieldErrors.submitterEmail = "邮箱太长。";
  } else if (
    submitterEmail.length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)
  ) {
    fieldErrors.submitterEmail = "请输入有效邮箱。";
  }

  if (sourceLinksText.length > MAX_SOURCE_LINKS_TEXT_LENGTH) {
    fieldErrors.sourceLinksText = `参考链接不能超过 ${MAX_SOURCE_LINKS_TEXT_LENGTH} 个字符。`;
  } else if (sourceLinks.length > MAX_SOURCE_LINKS) {
    fieldErrors.sourceLinksText = `最多提交 ${MAX_SOURCE_LINKS} 个参考链接。`;
  } else {
    for (const link of sourceLinks) {
      try {
        const url = new URL(link);
        if (!["http:", "https:"].includes(url.protocol)) {
          fieldErrors.sourceLinksText = "参考链接必须使用 http 或 https。";
          break;
        }
      } catch {
        fieldErrors.sourceLinksText = "参考链接必须是有效 URL。";
        break;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      topicId: input.topicId?.trim() || null,
      publishedVersionId: input.publishedVersionId?.trim() || null,
      moduleAnchor,
      feedbackType: input.feedbackType as FeedbackType,
      body,
      sourceLinks,
      submitterEmail: submitterEmail || null,
      turnstileToken: input.turnstileToken,
    },
    fieldErrors: {},
  };
}
