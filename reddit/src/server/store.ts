import { redis } from "@devvit/web/server";
import { DAILY_LEVELS, DailyLevel, dailyScore, overParBucket, shiftDate, utcDateKey } from "@/utils/dailyCore";
import type { Distribution, LeaderboardEntry, LeaderboardResponse, LevelStats, SavedResult } from "../shared/api";

type StoredResult = { username: string; moves: number; restarts: number; par: number; timeMs: number };

const resultsKey = (date: string, level: DailyLevel) => `results:${date}:${level}`;
// v2: ranked by moves, then restarts, then time (v1 added restarts into the score).
const boardKey = (date: string, level: DailyLevel) => `board2:${date}:${level}`;
const distributionKey = (date: string, level: DailyLevel) => `dist:${date}:${level}`;
const attemptsKey = (date: string, level: DailyLevel, userId: string) => `attempts:${date}:${level}:${userId}`;
const statsKey = (level: DailyLevel, userId: string) => `stats:${level}:${userId}`;

// Lower is better: score, then restarts (capped at 999), then milliseconds (capped below a billion).
// Stays under 2^53 for any score below 9000.
const boardScore = (result: StoredResult) => dailyScore(result) * 1e12 + Math.min(result.restarts, 999) * 1e9 + Math.min(result.timeMs, 1e9 - 1);

export async function countAttempt(date: string, level: DailyLevel, userId: string) {
  return redis.incrBy(attemptsKey(date, level, userId), 1);
}

export async function attemptsFor(date: string, userId: string) {
  const values = await redis.mGet(DAILY_LEVELS.map(({ level }) => attemptsKey(date, level, userId)));
  return Object.fromEntries(DAILY_LEVELS.map(({ level }, i) => [level, Number(values[i] ?? 0)])) as Record<DailyLevel, number>;
}

async function storedResult(date: string, level: DailyLevel, userId: string): Promise<StoredResult | null> {
  const raw = await redis.hGet(resultsKey(date, level), userId);
  return raw ? (JSON.parse(raw) as StoredResult) : null;
}

/** Builds the board and the distribution from saved results for days solved before they existed. */
async function ensureIndexes(date: string, level: DailyLevel) {
  if (await redis.exists(boardKey(date, level))) return;
  const saved = await redis.hGetAll(resultsKey(date, level));
  const entries = Object.entries(saved);
  if (entries.length === 0) return;
  const counts: Record<string, string> = {};
  const members = entries.map(([userId, raw]) => {
    const result = JSON.parse(raw) as StoredResult;
    const score = String(dailyScore(result));
    counts[score] = String(Number(counts[score] ?? 0) + 1);
    return { member: userId, score: boardScore(result) };
  });
  await redis.zAdd(boardKey(date, level), ...members);
  await redis.hSet(distributionKey(date, level), counts);
}

async function withRank(date: string, level: DailyLevel, userId: string, result: StoredResult): Promise<SavedResult> {
  await ensureIndexes(date, level);
  const [rank, total] = await Promise.all([redis.zRank(boardKey(date, level), userId), redis.zCard(boardKey(date, level))]);
  return { moves: result.moves, restarts: result.restarts, par: result.par, timeMs: result.timeMs, rank: (rank ?? 0) + 1, total };
}

export async function resultFor(date: string, level: DailyLevel, userId: string) {
  const result = await storedResult(date, level, userId);
  return result ? withRank(date, level, userId, result) : null;
}

/** Saves a verified solve. Only the first one for a puzzle counts; returns false if one was already in. */
export async function saveResult(date: string, level: DailyLevel, userId: string, result: StoredResult) {
  await ensureIndexes(date, level);
  const isNew = await redis.hSetNX(resultsKey(date, level), userId, JSON.stringify(result));
  if (!isNew) return false;
  await redis.zAdd(boardKey(date, level), { member: userId, score: boardScore(result) });
  await redis.hIncrBy(distributionKey(date, level), String(dailyScore(result)), 1);
  await updateStats(date, level, userId, result);
  return true;
}

async function updateStats(date: string, level: DailyLevel, userId: string, result: StoredResult) {
  const saved = await redis.hGetAll(statsKey(level, userId));
  const last = saved.last;
  let streak = Number(saved.streak ?? 0);
  let latest = last;
  // Streaks follow puzzle dates, so catching up on yesterday's post late still counts for yesterday.
  if (!last || date > last) {
    streak = last && shiftDate(last, 1) === date ? streak + 1 : 1;
    latest = date;
  }
  const bucket = `p${overParBucket(dailyScore(result), result.par)}`;
  await redis.hSet(statsKey(level, userId), {
    last: latest ?? date,
    streak: String(streak),
    best: String(Math.max(Number(saved.best ?? 0), streak)),
    played: String(Number(saved.played ?? 0) + 1),
    [bucket]: String(Number(saved[bucket] ?? 0) + 1),
  });
}

export async function statsFor(level: DailyLevel, userId: string): Promise<LevelStats> {
  const saved = await redis.hGetAll(statsKey(level, userId));
  const today = utcDateKey();
  // A streak is still alive until a whole day's puzzle goes unplayed.
  const alive = saved.last === today || saved.last === shiftDate(today, -1);
  return {
    played: Number(saved.played ?? 0),
    streak: alive ? Number(saved.streak ?? 0) : 0,
    bestStreak: Number(saved.best ?? 0),
    overPar: [0, 1, 2, 3].map((i) => Number(saved[`p${i}`] ?? 0)) as LevelStats["overPar"],
  };
}

/** How many solvers finished on each score, lowest score first. */
async function distribution(date: string, level: DailyLevel): Promise<Distribution> {
  const counts = await redis.hGetAll(distributionKey(date, level));
  return Object.entries(counts)
    .map(([score, count]) => ({ score: Number(score), count: Number(count) }))
    .sort((a, b) => a.score - b.score);
}

export async function leaderboard(date: string, level: DailyLevel, userId: string | undefined, size = 10): Promise<LeaderboardResponse> {
  await ensureIndexes(date, level);
  const key = boardKey(date, level);
  const [top, total, myRank, scores] = await Promise.all([
    redis.zRange(key, 0, size - 1, { by: "rank" }),
    redis.zCard(key),
    userId ? redis.zRank(key, userId) : Promise.resolve(undefined),
    distribution(date, level),
  ]);
  const entry = async (member: string, rank: number): Promise<LeaderboardEntry | null> => {
    const result = await storedResult(date, level, member);
    return result && { rank: rank + 1, username: result.username, score: dailyScore(result), moves: result.moves, restarts: result.restarts, timeMs: result.timeMs };
  };
  const entries = (await Promise.all(top.map(({ member }, i) => entry(member, i)))).filter((e): e is LeaderboardEntry => e !== null);
  const me = userId && myRank !== undefined && myRank !== null ? await entry(userId, myRank) : null;
  return { top: entries, me, total, distribution: scores };
}

// ---------- daily posts ----------

export const postKey = (date: string) => `post:${date}`;

export async function postFor(date: string) {
  return redis.get(postKey(date));
}

/** True for exactly one caller per date, so two triggers can't both create the day's post. */
export async function claimPost(date: string) {
  const claimed = await redis.set(`post-claim:${date}`, "1", { nx: true, expiration: new Date(Date.now() + 10 * 60_000) });
  return Boolean(claimed);
}

export async function rememberPost(date: string, postId: string) {
  await redis.set(postKey(date), postId);
}
