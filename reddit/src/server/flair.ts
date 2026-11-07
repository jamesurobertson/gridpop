import { context, reddit } from "@devvit/web/server";
import { DAILY_LEVELS } from "@/utils/dailyCore";
import { statsFor } from "./store";

// A flair this app wrote. Anything else is the player's own, which we leave alone.
const OURS = /^\d+ solves?( \| 🔥 \d+)?$/;

/** Sets the player's flair to their solves and best current streak, e.g. "12 solves | 🔥 5". */
export async function updateScoreFlair(userId: string, username: string) {
  try {
    const user = await reddit.getCurrentUser();
    const current = (await user?.getUserFlairBySubreddit(context.subredditName))?.flairText ?? "";
    if (current && !OURS.test(current)) return;
    const stats = await Promise.all(DAILY_LEVELS.map(({ level }) => statsFor(level, userId)));
    const solves = stats.reduce((sum, level) => sum + level.played, 0);
    const streak = Math.max(...stats.map((level) => level.streak));
    const text = `${solves} ${solves === 1 ? "solve" : "solves"}${streak > 0 ? ` | 🔥 ${streak}` : ""}`;
    if (text === current) return;
    await reddit.setUserFlair({ subredditName: context.subredditName, username, text, backgroundColor: "#E7DFFF", textColor: "dark" });
  } catch (e) {
    // Flair is a nicety: a subreddit with flair turned off shouldn't break saving a solve.
    console.error("Flair not set:", e);
  }
}
