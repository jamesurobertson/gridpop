// Records marketing/src/video.html driving the real game (the vite dev server, run with
// `npx vite --port 5185`) into out/frames (JPEGs with timestamps), out/events.json (every sound the
// game played, and when) and out/timeline.json (the bars the music has to hit). Everything lands on
// a 120 BPM beat clock, so `node music.mjs` can write a track that fits. `npm run video` does it all.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "out");
const STAGE = path.join(HERE, "../video.html");
const GAME = "http://localhost:5185/gridpop/";
// Yesterday's Hard (Daily #6): already played, and its fourth piece pops a row.
const PUZZLE_TIME = Date.parse("2026-11-10T17:00:00Z");
const BEAT = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: ["--window-size=1920,1080", "--allow-file-access-from-files", "--hide-scrollbars", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument((puzzleTime) => {
  if (location.port !== "5185") return;
  const offset = puzzleTime - Date.now();
  const RealDate = Date;
  class ShiftedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...args);
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  window.Date = ShiftedDate;
  try {
    localStorage.setItem("gridpop-how-to-play-seen", "1");
    localStorage.setItem("gridpop-coached", "1");
    localStorage.setItem("gridpop-level", "hard");
  } catch {}
}, PUZZLE_TIME);

await page.goto(`file://${STAGE}`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
// The game loads under the intro, so it's ready when the intro clears.
await page.evaluate((url) => (document.getElementById("game").src = url), GAME);
const game = await (async () => {
  for (;;) {
    const frame = page.frames().find((f) => f.url().startsWith(GAME));
    if (frame) return frame;
    await sleep(50);
  }
})();
await game.waitForSelector("[data-next-panel]");
await game.evaluate(async () => {
  const { sfx } = await import("/gridpop/src/audio/sfx.ts");
  window.__sounds = [];
  const play = sfx.play.bind(sfx);
  sfx.play = (name, opts = {}) => {
    window.__sounds.push({ name, at: performance.timeOrigin + performance.now() + (opts.delay ?? 0) * 1000 });
    return play(name, opts);
  };
});

// Key presses for each placement, worked out with the game's own movement rules.
const plan = await game.evaluate(async () => {
  const core = await import("/gridpop/src/utils/dailyCore.ts");
  const run = await import("/gridpop/src/utils/dailyRun.ts");
  const logic = await import("/gridpop/src/utils/gameLogic.ts");
  const { TETROMINO_SHAPES } = await import("/gridpop/src/utils/tetrominoShapes.ts");
  const puzzles = (await import("/gridpop/src/data/dailyPuzzles.json?import")).default;
  const date = core.easternDateKey();
  const puzzle = core.pickPuzzle(puzzles.hard, date);
  const target = core.parseTarget(puzzle.target);
  const actions = [];
  for (let i = 0; i < puzzle.pieces.length; i++) {
    const hint = run.hintFor(puzzle.pieces, target, actions, puzzle.par);
    if (!hint || hint.undo) break;
    actions.push({ type: "place", ...hint.placement });
  }
  const keysTo = (piece, grid, goal) => {
    const keys = [];
    const count = piece.shape.rotations.length;
    let current = piece;
    const turns = (goal.rotation - current.rotation + count) % count;
    const clockwise = turns <= count / 2;
    for (let n = 0; n < (clockwise ? turns : count - turns); n++) {
      const rotation = (current.rotation + (clockwise ? 1 : -1) + count) % count;
      const position = logic.tryWallKick(grid, { ...current, rotation }, rotation);
      current = { ...current, rotation, position };
      keys.push(clockwise ? "d" : "a");
    }
    const dx = goal.x - current.position.x;
    const dy = goal.y - current.position.y;
    for (let n = 0; n < Math.abs(dx); n++) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
    for (let n = 0; n < Math.abs(dy); n++) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
    return { keys, piece: { ...current, position: { x: goal.x, y: goal.y } } };
  };
  let grid = logic.createEmptyGrid(4);
  const steps = [];
  actions.forEach((action, i) => {
    const spawn = logic.createTetromino(TETROMINO_SHAPES[puzzle.pieces[i]], 4);
    const goal = { rotation: action.rotation, x: action.x, y: action.y };
    const step = { type: puzzle.pieces[i] };
    if (i === 1) {
      // A wrong spot first, then undo, so the replay has something to show.
      const tries = [goal.x + 1, goal.x - 1].map((x) => ({ ...goal, x })).concat([goal.y + 1, goal.y - 1].map((y) => ({ ...goal, y })));
      const wrong = tries.find((spot) => logic.isValidPosition(grid, { ...spawn, rotation: spot.rotation, position: { x: spot.x, y: spot.y } }));
      const first = keysTo(spawn, grid, wrong);
      step.wrongKeys = first.keys;
      step.keys = keysTo(first.piece, grid, goal).keys;
    } else {
      step.keys = keysTo(spawn, grid, goal).keys;
    }
    grid = run.placeAndClear(grid, { ...spawn, rotation: action.rotation, position: { x: action.x, y: action.y } });
    steps.push(step);
  });
  return { number: core.puzzleNumber(date), pieces: puzzle.pieces, steps };
});
console.log(`Daily #${plan.number}`, plan.pieces.join(" "), plan.steps.map((s) => s.keys.join(",")));

const stage = (method, ...args) => page.evaluate((m, a) => window.stage[m](...a), method, args);
const rectOf = (selector) =>
  game.evaluate((sel) => {
    const element = typeof sel === "string" ? document.querySelector(sel) : null;
    const r = element?.getBoundingClientRect();
    return r && { x: r.x, y: r.y, w: r.width, h: r.height };
  }, selector);
const union = (a, b) => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
/** Frames a rect: centered, as big as fits with some room around it. */
const frame = (r, most = 1.6) => [Math.min(most, 1700 / r.w, 980 / r.h), r.x + r.w / 2, r.y + r.h / 2];

// ---------- recording, on a beat clock ----------
const client = await page.createCDPSession();
const frames = [];
let firstFrameAt = 0;
client.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  if (!firstFrameAt) firstFrameAt = Date.now();
  const file = `frames/${String(frames.length).padStart(5, "0")}.jpg`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  frames.push({ file, ts: metadata.timestamp });
  await client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await client.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
while (!firstFrameAt) await sleep(10);
const at = async (beat) => {
  const wait = firstFrameAt + beat * BEAT - Date.now();
  if (wait > 0) await sleep(wait);
};
/** The first downbeat at least `lead` beats from now. */
const nextBar = (lead = 0.5) => Math.ceil(((Date.now() - firstFrameAt) / BEAT + lead) / 4) * 4;
const timeline = { bpm: 120, cards: [], end: 0 };
const card = async (beat, text, hot) => {
  await at(beat);
  await stage("card", text, hot);
  timeline.cards.push(beat / 4);
  await at(beat + 3);
  await stage("cardOut");
};

const press = async (keys) => {
  for (const key of keys) {
    await page.keyboard.press(key);
    await sleep(key === "a" || key === "d" ? 210 : 150);
  }
};
const place = async (keys) => {
  await press(keys);
  await sleep(260);
  await page.keyboard.press("Space");
};

// ---------- intro ----------
await stage("intro");
await at(7.2);
await stage("introOut");
await page.evaluate(() => document.getElementById("game").focus());
await game.evaluate(() => window.focus());

const board = await rectOf(".gp-board-wrap");
const next = await game.evaluate(() => {
  const r = document.querySelector("[data-next-panel]").parentElement.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const target = await game.evaluate(() => {
  const label = [...document.querySelectorAll(".gp-label")].find((el) => el.textContent.trim() === "Target");
  const r = label.parentElement.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const play = frame(union(board, next), 1.18);

// ---------- the goal ----------
await card(8, "Match the target", ["target"]);
await at(12);
await stage("camera", ...frame(target, 1.9));
await at(15);
await stage("camera", 1);

// ---------- +1 ----------
await card(16, "Every piece adds +1", ["+1"]);
await stage("camera", ...play);
await sleep(500);
await place(plan.steps[0].keys);
await sleep(900);
await place(plan.steps[1].wrongKeys);
await sleep(700);
await page.keyboard.press("z");
await sleep(600);
await place(plan.steps[1].keys);
await sleep(700);

// ---------- pop ----------
let beat = nextBar();
await card(beat, "Fill a row. Pop!", ["Pop!"]);
await sleep(400);
await place(plan.steps[2].keys);
await sleep(800);
await place(plan.steps[3].keys);
await sleep(230);
{
  const [scale, cx, cy] = play;
  const bx = board.x + board.w / 2, by = board.y + board.h / 2;
  await stage("pop", 960 + (bx - cx) * scale, 540 + (by - cy) * scale);
  await stage("shake");
}
await sleep(1100);
await place(plan.steps[4].keys);
await sleep(600);
await stage("camera", 1);

// ---------- result ----------
beat = nextBar(1.5);
await card(beat, "Fastest time wins", ["Fastest"]);
await game.waitForSelector('[role="dialog"]');
const result = await rectOf('[role="dialog"]');
await stage("camera", ...frame(result, 1.5));
await at(beat + 8);

// ---------- replay ----------
beat += 8;
await at(beat);
await stage("card", "Watch it back", ["back"]);
timeline.cards.push(beat / 4);
await sleep(250);
const clickButton = (label, inDialog) =>
  game.evaluate(
    (text, dialogOnly) => {
      const scope = dialogOnly ? document.querySelectorAll('[role="dialog"]') : [document];
      for (const root of scope) {
        const button = [...root.querySelectorAll("button")].find((b) => b.textContent.trim().includes(text));
        if (button) return button.click(), true;
      }
      return false;
    },
    label,
    inDialog
  );
await stage("camera", 1);
if (!(await clickButton("Watch replay"))) throw new Error("No Watch replay button");
await sleep(150);
await clickButton("Normal", true);
await sleep(200);
const replay = await rectOf('[role="dialog"]');
await stage("camera", ...frame(replay, 1.55));
await at(beat + 3);
await stage("cardOut");

// ---------- end ----------
beat = Math.max(nextBar(), beat + 16);
await at(beat);
await stage("end");
timeline.end = beat / 4;
await at(beat + 9);

const gameSounds = await game.evaluate(() => window.__sounds);
const events = gameSounds.map(({ name, at: when }) => ({ t: when - firstFrameAt, name })).filter((e) => e.t >= 0 && e.t < timeline.end * 4 * BEAT);
await client.send("Page.stopScreencast");
await sleep(200);
fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
fs.writeFileSync(path.join(OUT, "events.json"), JSON.stringify(events));
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(timeline));
console.log(`${frames.length} frames over ${(frames.at(-1).ts - frames[0].ts).toFixed(1)}s, ${events.length} sounds`, timeline);
await browser.close();
