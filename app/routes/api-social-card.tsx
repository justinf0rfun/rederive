import { getSocialCardById } from "~/domain/social-cards/repository.server";
import type { Route } from "./+types/api-social-card";

export async function loader({ context, params }: Route.LoaderArgs) {
  const card = await getSocialCardById(context.cloudflare.env.DB, params.cardId);
  if (!card) {
    throw new Response("Social card not found", { status: 404 });
  }

  const object = await context.cloudflare.env.ARTIFACTS.get(card.r2ObjectKey);
  if (!object) {
    throw new Response("Social card asset not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type":
        object.httpMetadata?.contentType || "image/svg+xml; charset=utf-8",
    },
  });
}
