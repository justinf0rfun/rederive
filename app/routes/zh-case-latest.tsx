import { CaseReader } from "~/components/case-reader";
import { getLatestPublishedVersionBySlug } from "~/domain/publishing/repository.server";
import type { Route } from "./+types/zh-case-latest";

export async function loader({ context, params }: Route.LoaderArgs) {
  const publishedVersion = await getLatestPublishedVersionBySlug(
    context.cloudflare.env.DB,
    params.topicSlug,
    "zh"
  );

  if (!publishedVersion) {
    throw new Response("Published case not found", { status: 404 });
  }

  return { publishedVersion };
}

export function meta({ data }: Route.MetaArgs) {
  const coverCard = data?.publishedVersion.content.socialCards.find(
    (card) => card.cardType === "cover"
  );
  return [
    {
      title: data
        ? `${data.publishedVersion.content.topic.displayName} - rederive`
        : "Case - rederive",
    },
    ...(coverCard?.url ? [{ property: "og:image", content: coverCard.url }] : []),
  ];
}

export default function CaseLatest({ loaderData }: Route.ComponentProps) {
  return (
    <CaseReader mode="latest" publishedVersion={loaderData.publishedVersion} />
  );
}
