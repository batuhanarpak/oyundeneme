/**
 * Synthesised SFX. Every sound is generated with oscillators, so the project
 * ships zero audio assets while still feeling like a real game interface.
 */

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur = 0.14, type = 'sine', gain = 0.06, delay = 0 }: ToneOpts) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;

  const osc = a.createOscillator();
  const g = a.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur = 0.2, gain = 0.05, band = 1200) {
  const a = ac();
  if (!a || muted) return;
  const frames = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, frames, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const src = a.createBufferSource();
  src.buffer = buf;

  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = band;
  filter.Q.value = 0.8;

  const g = a.createGain();
  g.gain.value = gain;

  src.connect(filter).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  hover: () => tone({ freq: 880, dur: 0.05, type: 'triangle', gain: 0.02 }),
  click: () => {
    tone({ freq: 620, to: 940, dur: 0.09, type: 'square', gain: 0.035 });
  },
  confirm: () => {
    tone({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.05 });
    tone({ freq: 990, dur: 0.16, type: 'triangle', gain: 0.045, delay: 0.08 });
  },
  deny: () => {
    tone({ freq: 200, to: 110, dur: 0.26, type: 'sawtooth', gain: 0.05 });
  },
  key: () => tone({ freq: 1400 + Math.random() * 260, dur: 0.03, type: 'square', gain: 0.018 }),
  success: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.05, delay: i * 0.07 })
    );
  },
  fail: () => {
    [330, 262, 196].forEach((f, i) =>
      tone({ freq: f, dur: 0.26, type: 'sawtooth', gain: 0.045, delay: i * 0.1 })
    );
  },
  attack: () => {
    noise(0.32, 0.075, 900);
    tone({ freq: 180, to: 60, dur: 0.34, type: 'sawtooth', gain: 0.06 });
  },
  hit: () => {
    noise(0.16, 0.07, 500);
    tone({ freq: 300, to: 90, dur: 0.18, type: 'square', gain: 0.05 });
  },
  chat: () => {
    tone({ freq: 1200, dur: 0.05, type: 'sine', gain: 0.03 });
    tone({ freq: 1600, dur: 0.07, type: 'sine', gain: 0.025, delay: 0.05 });
  },
  alarm: () => {
    [0, 0.22].forEach((d) => tone({ freq: 740, to: 420, dur: 0.2, type: 'sawtooth', gain: 0.045, delay: d }));
  },
  power: () => {
    tone({ freq: 90, to: 240, dur: 0.5, type: 'sawtooth', gain: 0.04 });
    noise(0.4, 0.03, 700);
  },
};
