import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { context, createServer, getServerPort, reddit } from "@devvit/web/server";
import type { TaskResponse } from "@devvit/web/server";
import type { TriggerResponse, UiResponse } from "@devvit/web/shared";
import puzzles from "@/data/dailyPuzzles.json";
import { DAILY_LEVELS, DailyLevel, DailyPuzzle, parseTarget, pickPuzzle, puzzleNumber, utcDateKey } from "@/utils/dailyCore";
import { replayRun } from "@/utils/dailyRun";
import type { AttemptRequest, AttemptResponse, PuzzleResponse, SubmitRequest, SubmitResponse } from "../shared/api";
import { attemptsFor, countAttempt, leaderboard, resultFor, saveResult, statsFor } from "./store";
import { ensureDailyPost } from "./posts";

const PUZZLES = puzzles as unknown as Record<DailyLevel, DailyPuzzle[]>;
const isLevel = (value: unknown): value is DailyLevel => DAILY_LEVELS.some(({ level }) => level === value);

/** The date this post is the puzzle for; posts made outside the daily flow play today's. */
function postDate(): string {
  const date = (context.postData as { date?: unknown } | undefined)?.date;
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : utcDateKey();
}

const perLevel = async <T>(make: (level: DailyLevel) => Promise<T>) =>
  Object.fromEntries(await Promise.all(DAILY_LEVELS.map(async ({ level }) => [level, await make(level)]))) as Record<DailyLevel, T>;

const app = new Hono();

app.get("/api/puzzle", async (c) => {
  const date = postDate();
  const { userId } = context;
  const username = userId ? ((await reddit.getCurrentUsername()) ?? null) : null;
  const levels = Object.fromEntries(
    DAILY_LEVELS.map(({ level }) => {
      const { pieces, target, par } = pickPuzzle(PUZZLES[level], date);
      return [level, { pieces, target, par }];
    })
  ) as PuzzleResponse["levels"];
  const emptyStats = { played: 0, streak: 0, bestStreak: 0, overPar: [0, 0, 0, 0] as [number, number, number, number] };
  const response: PuzzleResponse = {
    date,
    number: puzzleNumber(date),
    username,
    levels,
    results: await perLevel((level) => (userId ? resultFor(date, level, userId) : Promise.resolve(null))),
    stats: await perLevel((level) => (userId ? statsFor(level, userId) : Promise.resolve(emptyStats))),
    attempts: userId ? await attemptsFor(date, userId) : { easy: 0, normal: 0, hard: 0 },
  };
  return c.json(response);
});

app.post("/api/attempt", async (c) => {
  const { date, level } = await c.req.json<AttemptRequest>();
  const { userId } = context;
  if (!userId || date !== postDate() || !isLevel(level)) return c.json<AttemptResponse>({ attempts: 0 });
  return c.json<AttemptResponse>({ attempts: await countAttempt(date, level, userId) });
});

app.post("/api/submit", async (c) => {
  const { date, level, actions, timeMs } = await c.req.json<SubmitRequest>();
  const { userId } = context;
  const fail = (reason: string) => c.json<SubmitResponse>({ ok: false, reason }, 400);
  if (!userId) return fail("logged out");
  if (date !== postDate() || !isLevel(level) || !Array.isArray(actions) || actions.length > 200) return fail("bad request");
  if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) return fail("bad time");

  const puzzle = pickPuzzle(PUZZLES[level], date);
  const replay = replayRun(puzzle.pieces, parseTarget(puzzle.target), actions);
  if (!replay.solved) return fail(replay.reason);

  const [username, attempts] = await Promise.all([reddit.getCurrentUsername(), attemptsFor(date, userId)]);
  await saveResult(date, level, userId, {
    username: username ?? "someone",
    moves: replay.moves,
    // The solving run is one of the attempts; a solve without any recorded counts as none.
    restarts: Math.max(0, attempts[level] - 1),
    par: puzzle.par,
    timeMs: Math.round(timeMs),
  });
  const [result, stats, board] = await Promise.all([resultFor(date, level, userId), statsFor(level, userId), leaderboard(date, level, userId)]);
  return c.json<SubmitResponse>({ ok: true, result: result!, stats, leaderboard: board });
});

app.get("/api/leaderboard", async (c) => {
  const level = c.req.query("level");
  if (!isLevel(level)) return c.json({ error: "bad level" }, 400);
  return c.json(await leaderboard(postDate(), level, context.userId));
});

// ---------- daily posts ----------

app.post("/internal/scheduler/daily-post", async (c) => {
  await ensureDailyPost(utcDateKey());
  return c.json<TaskResponse>({ status: "ok" });
});

app.post("/internal/triggers/on-app-install", async (c) => {
  try {
    await ensureDailyPost(utcDateKey());
    return c.json<TriggerResponse>({ status: "success", message: "Posted today's puzzle" });
  } catch (e) {
    console.error(`Couldn't post today's puzzle on install: ${e}`);
    return c.json<TriggerResponse>({ status: "error", message: "Couldn't post today's puzzle" }, 400);
  }
});

app.post("/internal/menu/post-today", async (c) => {
  try {
    const postId = await ensureDailyPost(utcDateKey());
    return c.json<UiResponse>({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${postId?.replace(/^t3_/, "")}` });
  } catch (e) {
    console.error(`Couldn't post today's puzzle: ${e}`);
    return c.json<UiResponse>({ showToast: "Couldn't post today's puzzle" }, 400);
  }
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
