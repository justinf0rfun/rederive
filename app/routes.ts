import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("zh", "routes/zh-home.tsx"),
  route("zh/method", "routes/zh-method.tsx"),
  route("zh/cases/:topicSlug", "routes/zh-case-latest.tsx"),
  route("zh/cases/:topicSlug/v/:versionId", "routes/zh-case-version.tsx"),
  route("zh/questions/:questionSlug", "routes/zh-question.tsx"),
  route("zh/patterns/:patternSlug", "routes/zh-pattern.tsx"),
  route("zh/feedback", "routes/zh-feedback.tsx"),
  route("zh/submit-topic", "routes/zh-submit-topic.tsx"),
  route("api/social-cards/:cardId", "routes/api-social-card.tsx"),
  route("admin", "routes/admin.tsx"),
  route("health", "routes/health.tsx"),
] satisfies RouteConfig;
