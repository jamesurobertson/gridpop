// Records marketing/src/video.html driving the real game (the vite dev server, run with
// `npx vite --port 5185`) into out/frames (JPEGs with timestamps) and out/events.json (every sound
// the game played, and when). Then `node assemble.mjs && node mix.mjs` make marketing/gridpop-video.mp4.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "out");
const STAGE = path.join(HERE, "../video.html");
const GAME = "http://localhost:5185/gridpop/";
// Yesterday's Hard (Daily #6): already played, and its fourth piece pops a row.
const PUZZLE_TIME = Date.parse("2026-11-10T17:00:00Z");

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

// ---------- recording ----------
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
const events = [];
const sound = (name, delay = 0) => events.push({ t: Date.now() - firstFrameAt + delay, name });

const say = (eyebrow, line) => page.evaluate((e, l) => window.stage.say(e, l), eyebrow, line);

// ---------- intro ----------
await page.evaluate((url) => {
  document.getElementById("game").src = url;
  window.stage.intro();
}, GAME);
sound("levelup", 150);
await sleep(3400);
await page.evaluate(() => window.stage.toPlay());
await sleep(1000);

const game = page.frames().find((frame) => frame.url().startsWith(GAME));
await game.waitForSelector("[data-next-panel]");
await page.evaluate(() => document.getElementById("game").focus());
await game.evaluate(() => window.focus());
// Every sound the game plays, logged with real time so the soundtrack lines up exactly.
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

const press = async (keys) => {
  for (const key of keys) {
    await page.keyboard.press(key);
    await sleep(key === "a" || key === "d" ? 230 : 170);
  }
};
const place = async (keys) => {
  await press(keys);
  await sleep(320);
  await page.keyboard.press("Space");
};

// ---------- the solve ----------
await say("The goal", "Build the <em>target</em> board.");
await sleep(2600);

await say("The rule", "Every piece adds <em>+1</em> to the tiles under it.");
await sleep(900);
await place(plan.steps[0].keys);
await sleep(1500);

await say("Undo", "Wrong spot? <em>Undo</em> it.");
await sleep(500);
await place(plan.steps[1].wrongKeys);
await sleep(900);
await page.keyboard.press("z");
await sleep(900);

await say("Plan ahead", "The <em>Next</em> column shows every piece you get.");
await sleep(500);
await place(plan.steps[1].keys);
await sleep(1100);
await place(plan.steps[2].keys);
await sleep(1300);

await say("Pop", "Fill a row with one number and it <em>pops</em>.");
await sleep(1200);
await place(plan.steps[3].keys);
await sleep(1700);

await place(plan.steps[4].keys);
await sleep(300);
await say(`Daily #${plan.number} · Hard`, "Same puzzle for everyone. <em>Fastest time</em> wins.");
await sleep(4300);

// ---------- the replay ----------
await say("Replay", "Watch your solve back, <em>undos</em> and all.");
await sleep(700);
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
if (!(await clickButton("Watch replay"))) throw new Error("No Watch replay button");
await sleep(400);
await clickButton("Normal", true);
await sleep(6600);

// ---------- end card ----------
await page.evaluate(() => window.stage.end());
sound("levelup", 150);
await sleep(4200);

const gameSounds = await game.evaluate(() => window.__sounds);
for (const { name, at } of gameSounds) events.push({ t: at - firstFrameAt, name });
await client.send("Page.stopScreencast");
await sleep(200);
fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
fs.writeFileSync(path.join(OUT, "events.json"), JSON.stringify(events));
console.log(`${frames.length} frames over ${(frames.at(-1).ts - frames[0].ts).toFixed(1)}s, ${events.length} sounds`);
await browser.close();
