import { CaseReader } from "~/components/case-reader";
import {
  getLatestPublishedVersionBySlug,
  getPublishedVersionById,
} from "~/domain/publishing/repository.server";
import type { Route } from "./+types/zh-case-version";

export async function loader({ context, params }: Route.LoaderArgs) {
  const publishedVersion = await getPublishedVersionById(
    context.cloudflare.env.DB,
    params.versionId
  );

  if (
    !publishedVersion ||
    publishedVersion.content.topic.slug !== params.topicSlug ||
    publishedVersion.language !== "zh"
  ) {
    throw new Response("Published version not found", { status: 404 });
  }

  const latestVersion = await getLatestPublishedVersionBySlug(
    context.cloudflare.env.DB,
    params.topicSlug,
    "zh"
  );

  return {
    latestVersionId: latestVersion?.id || null,
    publishedVersion,
  };
}

export function meta({ data }: Route.MetaArgs) {
  const coverCard = data?.publishedVersion.content.socialCards.find(
    (card) => card.cardType === "cover"
  );
  return [
    {
      title: data
        ? `${data.publishedVersion.content.topic.displayName} v${data.publishedVersion.versionNumber} - rederive`
        : "Case version - rederive",
    },
    ...(coverCard?.url ? [{ property: "og:image", content: coverCard.url }] : []),
  ];
}

export default function CaseVersion({ loaderData }: Route.ComponentProps) {
  return (
    <CaseReader
      latestVersionId={loaderData.latestVersionId}
      mode="version"
      publishedVersion={loaderData.publishedVersion}
    />
  );
}
