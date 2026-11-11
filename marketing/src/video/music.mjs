// Writes out/music.wav: a bouncy 120 BPM loop in C (I–vi–IV–V) built to fit out/timeline.json, with
// a crash on every card's downbeat and a big final chord on the end card's. Pure synthesis, no
// samples, so there's nothing to license.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "out");
const { bpm, cards, end } = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json")));
const RATE = 44100;
const BEAT = 60 / bpm;
const BAR = BEAT * 4;
const length = Math.ceil((end * BAR + 4.5) * RATE);
const mix = new Float32Array(length);

let seed = 12345;
const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
const midi = (note) => 440 * 2 ** ((note - 69) / 12);

/** Adds `seconds` of `voice(t)` at `start`, scaled by `gain`. */
function add(start, seconds, gain, voice) {
  const from = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  for (let i = 0; i < count && from + i < length; i++) mix[from + i] += gain * voice(i / RATE);
}

// ---------- instruments ----------
const kick = (at, gain = 0.9) =>
  add(at, 0.35, gain, (t) => {
    const phase = 2 * Math.PI * (45 * t + (75 / 18) * (1 - Math.exp(-18 * t)));
    return Math.sin(phase) * Math.exp(-9 * t) * Math.min(1, t / 0.002);
  });
function clap(at, gain = 0.35) {
  let last = 0, prev = 0;
  add(at, 0.22, gain, (t) => {
    const x = noise();
    const y = 0.75 * (last + x - prev);
    prev = x;
    last = y;
    const flutter = t < 0.03 ? 0.6 + 0.4 * Math.cos(t * 2 * Math.PI * 100) : 1;
    return y * Math.exp(-22 * t) * flutter;
  });
}
function hat(at, gain = 0.12, decay = 70) {
  let last = 0, prev = 0;
  add(at, 0.08, gain, (t) => {
    const x = noise();
    const y = 0.5 * (last + x - prev);
    prev = x;
    last = y;
    return y * Math.exp(-decay * t);
  });
}
function crash(at, gain = 0.22) {
  let last = 0, prev = 0;
  add(at, 1.8, gain, (t) => {
    const x = noise();
    const y = 0.6 * (last + x - prev);
    prev = x;
    last = y;
    return y * Math.exp(-2.4 * t);
  });
}
/** A rounded square bass with a quick pluck. */
function bass(at, note, seconds, gain = 0.32) {
  const f = midi(note);
  let low = 0;
  add(at, seconds, gain, (t) => {
    const square = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6 + Math.sin(2 * Math.PI * f * t) * 0.6;
    low += (square - low) * 0.12;
    return low * Math.exp(-3.5 * t) * Math.min(1, t / 0.004) * Math.min(1, (seconds - t) / 0.01);
  });
}
/** A short, bright chord stab. */
const stab = (at, notes, gain = 0.09) =>
  notes.forEach((note) => {
    const f = midi(note);
    add(at, 0.25, gain, (t) => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * 2 * f * t) + 0.15 * Math.sin(2 * Math.PI * 3.01 * f * t)) * Math.exp(-16 * t) * Math.min(1, t / 0.003));
  });
/** Marimba-ish lead, with an echo three sixteenths later. */
function marimba(at, note, gain = 0.2) {
  const f = midi(note);
  const voice = (t) => (Math.sin(2 * Math.PI * f * t) * Math.exp(-7 * t) + 0.45 * Math.sin(2 * Math.PI * 4 * f * t) * Math.exp(-28 * t)) * Math.min(1, t / 0.002);
  add(at, 0.7, gain, voice);
  add(at + BEAT * 0.75, 0.7, gain * 0.32, voice);
  add(at + BEAT * 1.5, 0.7, gain * 0.12, voice);
}
/** A soft sustained chord for the ending. */
const pad = (at, notes, seconds, gain = 0.07) =>
  notes.forEach((note, i) => {
    const f = midi(note);
    add(at, seconds, gain, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2.003 * f * t + i)) * Math.exp(-1.1 * t) * Math.min(1, t / 0.02));
  });

// ---------- the song ----------
// I–vi–IV–V: root for the bass, a voicing for the stabs.
const CHORDS = [
  { root: 36, notes: [64, 67, 72] },
  { root: 33, notes: [64, 69, 72] },
  { root: 41, notes: [65, 69, 72] },
  { root: 43, notes: [62, 67, 71] },
];
// Eighth notes over four bars (null rests); the second time round it ends home on C.
const MELODY = [
  [76, null, 79, null, 81, 79, 76, null],
  [72, null, 76, 74, 72, null, 69, null],
  [69, 72, null, 69, 72, 74, 72, null],
  [74, null, 79, null, 76, 74, null, null],
  [76, null, 79, null, 81, 79, 76, 79],
  [81, null, 79, 76, 72, null, 74, null],
  [72, 69, null, 72, 74, null, 76, null],
  [74, 76, 79, null, 84, null, null, null],
];
// Bass in eighths: root, rest, root, octave, root, rest, fifth, octave.
const BASS = [0, null, 0, 12, 0, null, 7, 12];

for (let bar = 0; bar < end; bar++) {
  const start = bar * BAR;
  const chord = CHORDS[bar % 4];
  const intro = bar < 2;
  for (let beat = 0; beat < 4; beat++) {
    const t = start + beat * BEAT;
    if (!intro || bar === 1) kick(t, intro ? 0.6 : 0.9);
    if (!intro && (beat === 1 || beat === 3)) clap(t);
    hat(t + BEAT / 2, intro ? 0.08 : 0.13);
    if (!intro) {
      hat(t + BEAT / 4, 0.05, 110);
      hat(t + (3 * BEAT) / 4, 0.05, 110);
    }
    stab(t + BEAT / 2, chord.notes, intro ? 0.06 : 0.085);
  }
  if (!intro || bar === 1) {
    BASS.forEach((step, i) => {
      if (step !== null) bass(start + (i * BEAT) / 2, chord.root + step, BEAT / 2 - 0.02, intro ? 0.2 : 0.3);
    });
  }
  // The tune comes in with the first card and rests in the bar before the end, for the lift.
  if (bar >= 2 && bar < end - 1) {
    MELODY[(bar - 2) % 8].forEach((note, i) => {
      if (note !== null) marimba(start + (i * BEAT) / 2, note);
    });
  }
}
// A rising build into the end card.
for (let i = 0; i < 8; i++) hat((end - 1) * BAR + 2 * BEAT + (i * BEAT) / 4, 0.05 + i * 0.012, 60);
cards.forEach((bar) => crash(bar * BAR));

// The end card: one big C chord, then let it ring.
const finale = end * BAR;
kick(finale, 1);
crash(finale, 0.3);
stab(finale, [60, 64, 67, 72, 76], 0.14);
bass(finale, 36, 1.6, 0.4);
pad(finale, [60, 64, 67, 72, 79], 4, 0.08);
marimba(finale, 84, 0.22);

// ---------- master ----------
let peak = 0;
for (let i = 0; i < length; i++) {
  mix[i] = Math.tanh(mix[i] * 1.1);
  peak = Math.max(peak, Math.abs(mix[i]));
}
const out = Buffer.alloc(44 + length * 2);
out.write("RIFF", 0);
out.writeUInt32LE(36 + length * 2, 4);
out.write("WAVEfmt ", 8);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(1, 22);
out.writeUInt32LE(RATE, 24);
out.writeUInt32LE(RATE * 2, 28);
out.writeUInt16LE(2, 32);
out.writeUInt16LE(16, 34);
out.write("data", 36);
out.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++) out.writeInt16LE(Math.round((mix[i] / peak) * 0.89 * 32767), 44 + i * 2);
fs.writeFileSync(path.join(OUT, "music.wav"), out);
console.log(`music.wav: ${(length / RATE).toFixed(1)}s, end card at bar ${end}`);
