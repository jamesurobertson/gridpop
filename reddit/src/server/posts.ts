import { context, reddit } from "@devvit/web/server";
import { puzzleNumber, shiftDate } from "@/utils/dailyCore";
import { claimPost, postFor, rememberPost } from "./store";

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Today's post, made (and pinned in place of yesterday's) if it doesn't exist yet. */
export async function ensureDailyPost(date: string): Promise<string | undefined> {
  const existing = await postFor(date);
  if (existing) return existing;
  if (!(await claimPost(date))) return postFor(date);

  const number = puzzleNumber(date);
  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: `GridPop #${number} · ${dayName(date)}`,
    entry: "default",
    postData: { date },
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
