import { context, reddit } from "@devvit/web/server";
import { puzzleNumber, shiftDate } from "@/utils/dailyCore";
import { claimPost, postFor, rememberPost } from "./store";
import { shareImageUrl } from "./shareImage";

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Gives the last `days` daily posts the share image, for posts made before it existed. */
export async function backfillShareImage(today: string, days = 30) {
  const shareImage = await shareImageUrl();
  if (!shareImage) return;
  for (let i = 0; i < days; i++) {
    const postId = await postFor(shiftDate(today, -i));
    if (!postId) continue;
    try {
      await (await reddit.getPostById(postId as `t3_${string}`)).setCustomPostStyles({ shareImageUrl: shareImage });
    } catch (e) {
      console.warn(`Couldn't set the share image on ${postId}: ${e}`);
    }
  }
}

/** Today's post, made (and pinned in place of yesterday's) if it doesn't exist yet. */
export async function ensureDailyPost(date: string): Promise<string | undefined> {
  const existing = await postFor(date);
  if (existing) return existing;
  if (!(await claimPost(date))) return postFor(date);

  const number = puzzleNumber(date);
  const shareImage = await shareImageUrl();
  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: `GridPop #${number} · ${dayName(date)}`,
    entry: "default",
    postData: { date },
    styles: { backgroundColor: "#FFF6EAFF", ...(shareImage && { shareImageUrl: shareImage }) },
    textFallback: {
      text: `GridPop daily #${number}: build the target board in as few pieces as you can. Open this post on new Reddit or the Reddit app to play.`,
    },
  });
  await rememberPost(date, post.id);

  // Pinning is a nicety; a full set of pinned posts shouldn't stop the day's puzzle going up.
  try {
    const yesterday = await postFor(shiftDate(date, -1));
    if (yesterday) await (await reddit.getPostById(yesterday as `t3_${string}`)).unsticky();
  } catch (e) {
    console.warn(`Couldn't unpin yesterday's post: ${e}`);
  }
  try {
    await post.sticky(1);
  } catch (e) {
    console.warn(`Couldn't pin today's post: ${e}`);
  }
  return post.id;
}
