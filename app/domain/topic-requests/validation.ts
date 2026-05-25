import type {
  TopicRequestInput,
  TopicRequestValidationResult,
} from "./types";

const MAX_TOPIC_LENGTH = 120;
const MAX_REASON_LENGTH = 1_200;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_LINKS = 8;
const MAX_SOURCE_LINKS_TEXT_LENGTH = 2_000;

export function normalizeTopicSlug(topicText: string): string {
  return topicText
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function parseSourceLinks(sourceLinksText: string): string[] {
  return sourceLinksText
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function validateTopicRequestInput(
  input: TopicRequestInput
): TopicRequestValidationResult {
  const fieldErrors: Record<string, string> = {};
  const topicText = input.topicText.trim();
  const reason = input.reason.trim();
  const submitterEmail = input.submitterEmail.trim();
  const sourceLinksText = input.sourceLinksText.trim();
  const sourceLinks = parseSourceLinks(sourceLinksText);

  if (topicText.length === 0) {
    fieldErrors.topicText = "请输入想看的技术主题。";
  } else if (topicText.length > MAX_TOPIC_LENGTH) {
    fieldErrors.topicText = `主题不能超过 ${MAX_TOPIC_LENGTH} 个字符。`;
  }

  if (reason.length > MAX_REASON_LENGTH) {
    fieldErrors.reason = `理由不能超过 ${MAX_REASON_LENGTH} 个字符。`;
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
      topicText,
      normalizedTopicSlug: normalizeTopicSlug(topicText),
      reason: reason.length > 0 ? reason : null,
      submitterEmail: submitterEmail.length > 0 ? submitterEmail : null,
      sourceLinks,
      locale: input.locale,
      turnstileToken: input.turnstileToken,
    },
    fieldErrors: {},
  };
}
