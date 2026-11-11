import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { context, createServer, getServerPort, reddit } from "@devvit/web/server";
import type { TaskResponse } from "@devvit/web/server";
import type { TriggerResponse, UiResponse } from "@devvit/web/shared";
import puzzles from "@/data/dailyPuzzles.json";
import solutions from "@/data/dailySolutions.json";
import { DAILY_LEVELS, DailyLevel, DailyPuzzle, formatClock, parseTarget, pickPuzzle, puzzleNumber, easternDateKey } from "@/utils/dailyCore";
import { hintFor, replayRun, replayTo } from "@/utils/dailyRun";
import type {
  AttemptResponse,
  ClockRequest,
  CountRequest,
  CommentRequest,
  CommentResponse,
  HintRequest,
  HintResponse,
  PuzzleResponse,
  SubmitRequest,
  SubmitResponse,
  UndoResponse,
} from "../shared/api";
import {
  attemptsFor,
  clocksFor,
  commentFor,
  countAttempt,
  countHint,
  countUndo,
  hintWaitMs,
  hintsFor,
  leaderboard,
  rememberComment,
  resultFor,
  saveClock,
  saveResult,
  statsFor,
  undosFor,
} from "./store";
import { backfillShareImage, ensureDailyPost, scoresComment } from "./posts";
import { updateScoreFlair } from "./flair";

const PUZZLES = puzzles as unknown as Record<DailyLevel, DailyPuzzle[]>;
// A par line per puzzle, as the cells each piece covers; hints fall back on it when a search is slow.
const SOLUTIONS = solutions as unknown as Record<DailyLevel, Record<string, number[][]>>;
const isLevel = (value: unknown): value is DailyLevel => DAILY_LEVELS.some(({ level }) => level === value);

/** The date this post is the puzzle for; posts made outside the daily flow play today's. */
function postDate(): string {
  const date = (context.postData as { date?: unknown } | undefined)?.date;
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : easternDateKey();
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
  const emptyStats = { played: 0, streak: 0, bestStreak: 0 };
  const response: PuzzleResponse = {
    date,
    number: puzzleNumber(date),
    username,
    levels,
    results: await perLevel((level) => (userId ? resultFor(date, level, userId) : Promise.resolve(null))),
    stats: await perLevel((level) => (userId ? statsFor(level, userId) : Promise.resolve(emptyStats))),
    attempts: userId ? await attemptsFor(date, userId) : { easy: 0, normal: 0, hard: 0 },
    undos: userId ? await undosFor(date, userId) : { easy: 0, normal: 0, hard: 0 },
    comments: await perLevel((level) => (userId ? commentFor(date, level, userId) : Promise.resolve(null))),
    clocks: userId ? await clocksFor(date, userId) : { easy: 0, normal: 0, hard: 0 },
  };
  return c.json(response);
});

app.post("/api/attempt", async (c) => {
  const { date, level } = await c.req.json<CountRequest>();
  const { userId } = context;
  if (!userId || date !== postDate() || !isLevel(level)) return c.json<AttemptResponse>({ attempts: 0 });
  return c.json<AttemptResponse>({ attempts: await countAttempt(date, level, userId) });
});

app.post("/api/clock", async (c) => {
  const { date, level, timeMs } = await c.req.json<ClockRequest>();
  const { userId } = context;
  if (!userId || date !== postDate() || !isLevel(level) || typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs < 0) return c.body(null, 204);
  await saveClock(date, level, userId, timeMs);
  return c.body(null, 204);
});

app.post("/api/undo", async (c) => {
  const { date, level } = await c.req.json<CountRequest>();
  const { userId } = context;
  if (!userId || date !== postDate() || !isLevel(level)) return c.json<UndoResponse>({ undos: 0 });
  return c.json<UndoResponse>({ undos: await countUndo(date, level, userId) });
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

  const [username, attempts, undos, hints, clocks] = await Promise.all([
    reddit.getCurrentUsername(),
    attemptsFor(date, userId),
    undosFor(date, userId),
    hintsFor(date, level, userId),
    clocksFor(date, userId),
  ]);
  const counted = await saveResult(date, level, userId, {
    username: username ?? "someone",
    moves: replay.moves,
    // A restart counts as one undo. The solving run is one of the attempts; a solve without any recorded counts as none.
    undos: Math.max(0, attempts[level] - 1) + undos[level],
    hints,
    par: puzzle.par,
    // Never less than the clock the server saw while they played, so reloading can't reset it.
    timeMs: Math.round(Math.max(timeMs, clocks[level])),
  });
  if (counted && username) await updateScoreFlair(userId, username);
  const [result, stats, board] = await Promise.all([resultFor(date, level, userId), statsFor(level, userId), leaderboard(date, level, userId)]);
  return c.json<SubmitResponse>({ ok: true, result: result!, stats, leaderboard: board });
});

// The server works hints out (and counts them) so the leaderboard's hint numbers can be trusted.
app.post("/api/hint", async (c) => {
  const { date, level, actions } = await c.req.json<HintRequest>();
  const { userId } = context;
  const fail = (reason: string, waitMs?: number) => c.json<HintResponse>({ ok: false, reason, waitMs }, 400);
  if (date !== postDate() || !isLevel(level) || !Array.isArray(actions) || actions.length > 200) return fail("bad request");
  const puzzle = pickPuzzle(PUZZLES[level], date);
  const target = parseTarget(puzzle.target);
  const cursor = replayTo(puzzle.pieces, target, actions);
  if (typeof cursor === "string" || cursor.solved) return fail(typeof cursor === "string" ? cursor : "already solved");

  // Only hints before the first solve count; replays afterwards are practice.
  const counted = !!userId && !(await resultFor(date, level, userId));
  if (counted) {
    const waitMs = await hintWaitMs(date, level, userId);
    if (waitMs > 0) return fail("too soon", waitMs);
  }
  const hint = hintFor(puzzle.pieces, target, actions, puzzle.par, SOLUTIONS[level][puzzle.date]);
  // A search that ran out of time gave nothing, so it isn't counted.
  const hints = hint && counted ? await countHint(date, level, userId) : 0;
  return c.json<HintResponse>({ ok: true, hint, hints });
});

app.post("/api/comment", async (c) => {
  const { level, message } = await c.req.json<CommentRequest>();
  const { userId, postId } = context;
  const fail = (reason: string) => c.json<CommentResponse>({ ok: false, reason }, 400);
  if (!userId || !postId) return fail("logged out");
  if (!isLevel(level) || typeof message !== "string" || message.length > 1900) return fail("bad comment");
  const date = postDate();
  const result = await resultFor(date, level, userId);
  if (!result) return fail("not solved");
  const label = DAILY_LEVELS.find((option) => option.level === level)!.label;
  const score = `GridPop #${puzzleNumber(date)} ${label} · ${formatClock(result.timeMs)}`;
  const note = message.trim();
  try {
    // A score alone replies under the pinned scores comment; one with the player's own words joins the thread.
    const parent = note ? (postId as `t3_${string}`) : await scoresComment(postId as `t3_${string}`);
    const comment = await reddit.submitComment({ id: parent, text: note ? `${note}\n\n${score}` : score, runAs: "USER" });
    await rememberComment(date, level, userId, comment.url);
    return c.json<CommentResponse>({ ok: true, url: comment.url });
  } catch (e) {
    console.error(`Couldn't post comment: ${e}`);
    return fail("not posted");
  }
});

app.get("/api/leaderboard", async (c) => {
  const level = c.req.query("level");
  if (!isLevel(level)) return c.json({ error: "bad level" }, 400);
  return c.json(await leaderboard(postDate(), level, context.userId));
});

// ---------- daily posts ----------

app.post("/internal/scheduler/daily-post", async (c) => {
  await ensureDailyPost(easternDateKey());
  return c.json<TaskResponse>({ status: "ok" });
});

app.post("/internal/triggers/on-app-install", async (c) => {
  try {
    await ensureDailyPost(easternDateKey());
    return c.json<TriggerResponse>({ status: "success", message: "Posted today's puzzle" });
  } catch (e) {
    console.error(`Couldn't post today's puzzle on install: ${e}`);
    return c.json<TriggerResponse>({ status: "error", message: "Couldn't post today's puzzle" }, 400);
  }
});

app.post("/internal/triggers/on-app-upgrade", async (c) => {
  await backfillShareImage(easternDateKey());
  return c.json<TriggerResponse>({ status: "success", message: "Share image set" });
});

app.post("/internal/menu/post-today", async (c) => {
  try {
    const postId = await ensureDailyPost(easternDateKey());
    return c.json<UiResponse>({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${postId?.replace(/^t3_/, "")}` });
  } catch (e) {
    console.error(`Couldn't post today's puzzle: ${e}`);
    return c.json<UiResponse>({ showToast: "Couldn't post today's puzzle" }, 400);
  }
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
