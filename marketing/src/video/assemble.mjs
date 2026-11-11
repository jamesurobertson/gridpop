// Turns out/frames (screencast frames, which arrive unevenly) into a steady 30fps out/silent.mp4.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "out");
process.chdir(OUT);
const frames = JSON.parse(fs.readFileSync("frames.json"));
const lines = [];
frames.forEach((frame, i) => {
  const next = frames[i + 1];
  lines.push(`file '${frame.file}'`);
  lines.push(`duration ${next ? Math.max(0.001, next.ts - frame.ts).toFixed(4) : "0.5"}`);
});
lines.push(`file '${frames.at(-1).file}'`);
fs.writeFileSync("frames.txt", lines.join("\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "frames.txt", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "silent.mp4"], { stdio: "inherit" });
