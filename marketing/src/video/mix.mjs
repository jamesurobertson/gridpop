// Lays out/music.wav and the game's sounds (at the moments they played) over out/silent.mp4:
// marketing/gridpop-video.mp4.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SOUNDS = path.join(HERE, "../../../public/sounds");
process.chdir(path.join(HERE, "out"));
const events = JSON.parse(fs.readFileSync("events.json")).filter((e) => e.t >= 0);
// The game's own balance (src/audio/sfx.ts), lifted a little for video.
const volume = { move: 0.2, rotate: 0.12, place: 0.6, hold: 0.45, clear: 0.7, combo: 0.5, click: 0.4, levelup: 0.55, best: 0.6 };
const file = (name) => (name === "move" || name === "rotate" ? path.join(HERE, `${name}.wav`) : `${SOUNDS}/${name}.mp3`);
const MUSIC = 0.5;
const args = ["-v", "error", "-y", "-i", "silent.mp4", "-i", "music.wav"];
events.forEach((e) => args.push("-i", file(e.name)));
const chains = events.map((e, i) => `[${i + 2}:a]adelay=${Math.round(e.t)}|${Math.round(e.t)},volume=${((volume[e.name] ?? 0.5) * 1.3).toFixed(2)}[a${i}]`);
chains.push(`[1:a]volume=${MUSIC}[music]`);
const mix = `[music]${events.map((_, i) => `[a${i}]`).join("")}amix=inputs=${events.length + 1}:normalize=0,alimiter=limit=0.89:level=disabled,apad[aout]`;
args.push("-filter_complex", [...chains, mix].join(";"), "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", path.join(HERE, "../../gridpop-video.mp4"));
execFileSync("ffmpeg", args, { stdio: "inherit" });
