import { media, redis } from "@devvit/web/server";
import shareImage from "./share-image.png?inline";

// Bump when share-image.png changes, so the new one is uploaded instead of the cached URL reused.
const SHARE_IMAGE_KEY = "share-image:v1";

/** The Reddit-hosted copy of the share image, uploaded the first time it's needed. */
export async function shareImageUrl(): Promise<string | undefined> {
  const cached = await redis.get(SHARE_IMAGE_KEY);
  if (cached) return cached;
  try {
    const { mediaUrl } = await media.upload({ url: shareImage, type: "image" });
    await redis.set(SHARE_IMAGE_KEY, mediaUrl);
    return mediaUrl;
  } catch (e) {
    console.warn(`Couldn't upload the share image: ${e}`);
    return undefined;
  }
}
