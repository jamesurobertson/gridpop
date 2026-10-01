/**
 * Sound effects (Kenney's CC0 Interface Sounds and Music Jingles), played through Web Audio so they
 * can overlap, be pitched and start instantly. Audio unlocks on the first tap or key press.
 */

export type SoundName =
  | "move"
  | "rotate"
  | "bump"
  | "place"
  | "hold"
  | "clear"
  | "combo"
  | "danger"
  | "click"
  | "open"
  | "levelup"
  | "boardclear"
  | "best"
  | "gameover";

/** Recorded sounds (in public/sounds). Move, rotate and bump are synthesised instead; see `synth`. */
const NAMES: SoundName[] = ["place", "hold", "clear", "combo", "danger", "click", "open", "levelup", "boardclear", "best", "gameover"];

/** Hand-balanced so quick, frequent sounds (moves) sit well under the rewarding ones. */
const VOLUME: Record<SoundName, number> = {
  move: 0.2,
  rotate: 0.12,
  bump: 0.25,
  place: 0.6,
  hold: 0.45,
  clear: 0.7,
  combo: 0.5,
  danger: 0.4,
  click: 0.4,
  open: 0.35,
  levelup: 0.55,
  boardclear: 0.7,
  best: 0.6,
  gameover: 0.55,
};

const MUTE_KEY = "gridpop-muted";

class Sfx {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  muted = localStorage.getItem(MUTE_KEY) === "true";

  constructor() {
    const unlock = () => this.unlock();
    for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, unlock, { capture: true });
    // Don't keep playing into a background tab.
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      // iOS: play through the silent switch, like a game should.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.8;
      this.out.connect(this.ctx.destination);
      this.load();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private load() {
    if (this.loading || !this.ctx) return;
    const ctx = this.ctx;
    this.loading = Promise.all(
      NAMES.map(async (name) => {
        try {
          const res = await fetch(`/sounds/${name}.mp3`);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // A missing sound just stays silent.
        }
      })
    ).then(() => undefined);
  }

  /**
   * A soft tone: a quick fade-in, a short fade-out and a gentle low-pass, so it never clicks or buzzes.
   * Used for the sounds you hear constantly (moving, rotating), which need to stay quiet and pleasant.
   */
  private tone(from: number, to: number, dur: number, vol: number, type: OscillatorType, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(gain).connect(this.out!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Chosen in the GridPop Sound Lab: Soft thud (move), Boing (rotate), Bonk (blocked move).
  private synth(name: SoundName, vol: number, jitter: number) {
    const j = 1 + (Math.random() * 2 - 1) * jitter;
    if (name === "move") {
      this.tone(240 * j, 170 * j, 0.07, vol, "sine");
      return true;
    }
    if (name === "rotate") {
      // A springy boing: the pitch rises fast while the note fades a little slower.
      const ctx = this.ctx!;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(300 * j, t);
      osc.frequency.exponentialRampToValueAtTime(620 * j, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(this.out!);
      osc.start(t);
      osc.stop(t + 0.2);
      return true;
    }
    if (name === "bump") {
      this.tone(160 * j, 120 * j, 0.08, vol, "triangle");
      return true;
    }
    return false;
  }

  /** `rate` pitches the sound (1 = as recorded); `jitter` adds a little random variation. */
  play(name: SoundName, opts: { rate?: number; vol?: number; jitter?: number; delay?: number } = {}) {
    if (this.muted || !this.ctx || !this.out) return;
    if (this.synth(name, VOLUME[name] * (opts.vol ?? 1), opts.jitter ?? 0)) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const jitter = opts.jitter ?? 0;
    src.playbackRate.value = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    const gain = this.ctx.createGain();
    gain.gain.value = VOLUME[name] * (opts.vol ?? 1);
    src.connect(gain).connect(this.out);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));
  }
}

export const sfx = new Sfx();
