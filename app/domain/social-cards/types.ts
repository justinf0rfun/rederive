import type { SocialCardManifestSchema } from "~/domain/redo/contract";
import type { z } from "zod";

export type SocialCardManifest = z.infer<typeof SocialCardManifestSchema>;

export type SocialCard = {
  id: string;
  publishedVersionId: string;
  cardType: SocialCardManifest["cardType"];
  moduleKey: string | null;
  r2ObjectKey: string;
  publicUrl: string;
  width: number;
  height: number;
  createdAt: string;
};
