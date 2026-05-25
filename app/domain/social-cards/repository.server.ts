import type { PublishedVersion } from "~/domain/publishing/types";
import type { RedoCaseSnapshot } from "~/domain/redo/contract";
import type { SocialCard, SocialCardManifest } from "./types";

type SocialCardRow = {
  id: string;
  published_version_id: string;
  card_type: SocialCard["cardType"];
  module_key: string | null;
  r2_object_key: string;
  public_url: string;
  width: number;
  height: number;
  created_at: string;
};

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export async function generateSocialCardsForPublishedVersion(
  db: D1Database,
  bucket: R2Bucket,
  publishedVersion: PublishedVersion
): Promise<SocialCard[]> {
  const specs = buildCardSpecs(publishedVersion);
  const cards: SocialCard[] = [];

  for (const spec of specs) {
    const id = `${publishedVersion.id}-${spec.cardType}`;
    const r2ObjectKey = `social-cards/${publishedVersion.id}/${spec.cardType}.svg`;
    const publicUrl = `/api/social-cards/${id}`;
    const svg = renderSocialCardSvg(publishedVersion.content, spec);

    await bucket.put(r2ObjectKey, svg, {
      httpMetadata: { contentType: "image/svg+xml; charset=utf-8" },
    });
    await db
      .prepare(
        [
          "INSERT INTO social_cards",
          "(id, published_version_id, card_type, module_key, r2_object_key, public_url, width, height)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          "ON CONFLICT(id) DO UPDATE SET",
          "r2_object_key = excluded.r2_object_key,",
          "public_url = excluded.public_url,",
          "width = excluded.width,",
          "height = excluded.height",
        ].join(" ")
      )
      .bind(
        id,
        publishedVersion.id,
        spec.cardType,
        spec.moduleKey || null,
        r2ObjectKey,
        publicUrl,
        CARD_WIDTH,
        CARD_HEIGHT
      )
      .run();
    const card = await getSocialCardById(db, id);
    if (card) {
      cards.push(card);
    }
  }

  await updatePublishedVersionSocialCards(db, publishedVersion, cards);
  return cards;
}

export async function getSocialCardById(
  db: D1Database,
  id: string
): Promise<SocialCard | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, published_version_id, card_type, module_key, r2_object_key, public_url, width, height, created_at",
        "FROM social_cards",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(id)
    .first<SocialCardRow>();

  return row ? mapSocialCardRow(row) : null;
}

export async function listSocialCardsForPublishedVersion(
  db: D1Database,
  publishedVersionId: string
): Promise<SocialCard[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, published_version_id, card_type, module_key, r2_object_key, public_url, width, height, created_at",
        "FROM social_cards",
        "WHERE published_version_id = ?",
        "ORDER BY card_type ASC",
      ].join(" ")
    )
    .bind(publishedVersionId)
    .all<SocialCardRow>();

  return result.results.map(mapSocialCardRow);
}

async function updatePublishedVersionSocialCards(
  db: D1Database,
  publishedVersion: PublishedVersion,
  cards: SocialCard[]
): Promise<void> {
  const content: RedoCaseSnapshot = {
    ...publishedVersion.content,
    socialCards: cards.map(toManifest),
  };

  await db
    .prepare(
      [
        "UPDATE published_versions",
        "SET content_json = ?, render_manifest_json = ?",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(
      JSON.stringify(content),
      JSON.stringify({
        ...publishedVersion.renderManifest,
        socialCards: cards.map(toManifest),
      }),
      publishedVersion.id
    )
    .run();
}

function buildCardSpecs(publishedVersion: PublishedVersion) {
  const content = publishedVersion.content;
  return [
    {
      cardType: "cover" as const,
      moduleKey: "cover",
      title: content.topic.displayName,
      body: content.orientation.oneSentenceVersion,
    },
    {
      cardType: "one_sentence" as const,
      moduleKey: "orientation",
      title: "One-sentence redo",
      body: content.orientation.oneSentenceVersion,
    },
    {
      cardType: "causal_chain" as const,
      moduleKey: "causal-chain",
      title: "Causal chain",
      body: content.causalChain.oneSentenceVersion,
    },
    {
      cardType: "debt_map" as const,
      moduleKey: "debt-map",
      title: "Debt map",
      body: `${content.debtMap.resolved.length} resolved, ${content.debtMap.mitigated.length} mitigated, ${content.debtMap.unresolved.length} unresolved.`,
    },
    {
      cardType: "pain_ranking" as const,
      moduleKey: "pain-ranking",
      title: "Top pain",
      body:
        content.painRanking[0]?.oneLineExplanation ||
        "Pain ranking is available in the published case.",
    },
  ];
}

function renderSocialCardSvg(
  content: RedoCaseSnapshot,
  spec: { body: string; cardType: string; title: string }
): string {
  const title = escapeXml(spec.title).slice(0, 120);
  const body = escapeXml(spec.body).slice(0, 260);
  const topic = escapeXml(content.topic.displayName);
  const version = escapeXml(`v${content.version.number}`);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`,
    '<rect width="1200" height="630" fill="#f5f4ef"/>',
    '<rect x="48" y="48" width="1104" height="534" fill="#fbfaf6" stroke="#d4d4d8" stroke-width="2"/>',
    '<line x1="96" y1="150" x2="1104" y2="150" stroke="#d4d4d8" stroke-width="2"/>',
    '<text x="96" y="112" fill="#047857" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24" letter-spacing="4">REDO BY REDERIVE</text>',
    `<text x="96" y="218" fill="#18181b" font-family="ui-sans-serif, system-ui, sans-serif" font-size="58" font-weight="700">${title}</text>`,
    `<foreignObject x="96" y="250" width="850" height="190"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:32px;line-height:1.35;color:#3f3f46">${body}</div></foreignObject>`,
    `<text x="96" y="530" fill="#52525b" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22">${topic} · ${version} · ${escapeXml(spec.cardType)}</text>`,
    '<circle cx="1040" cy="500" r="54" fill="#ecfdf5" stroke="#047857" stroke-width="2"/>',
    '<text x="1006" y="510" fill="#047857" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24">redo</text>',
    "</svg>",
  ].join("");
}

function toManifest(card: SocialCard): SocialCardManifest {
  return {
    id: card.id,
    cardType: card.cardType,
    moduleKey: card.moduleKey || undefined,
    status: "ready",
    url: card.publicUrl,
  };
}

function mapSocialCardRow(row: SocialCardRow): SocialCard {
  return {
    id: row.id,
    publishedVersionId: row.published_version_id,
    cardType: row.card_type,
    moduleKey: row.module_key,
    r2ObjectKey: row.r2_object_key,
    publicUrl: row.public_url,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
