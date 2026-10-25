// Settings for "Wick learns to speak", shared by the widget, its worker, the checkpoint script and the tests.
export const VOICE = {
  /** Training steps in the live run (each step: 32 random examples from the training messages). */
  steps: 10000,
  /** Wick prints a sample on its tape before training (step 0), at these early steps, and every `sampleEvery`. */
  sampleAt: [0, 100, 250],
  sampleEvery: 500,
  sampleChars: 110,
  /**
   * Samples are drawn at this temperature unless the reader turns the knob (1 = exactly as the model's
   * probabilities say; lower = more careful).
   */
  temperature: 0.6,
  /** Positions of the Day Shift messages used to measure how often Wick's first guess is right. */
  evalPositions: 2000,
  /** A longer, precomputed run, offered after the live one. */
  longSteps: 100000,
} as const;

export const isSampleStep = (s: number) => (VOICE.sampleAt as readonly number[]).includes(s) || (s > 0 && s % VOICE.sampleEvery === 0);

/** The random seed for the sample printed at a given step, so every reader sees the same tape. */
export const sampleSeed = (step: number) => 1000 + step;

/** Messages from the worker to the page. */
export type VoiceOut =
  | { type: 'progress'; step: number; stepsPerSecond: number }
  | { type: 'sample'; step: number; text: string; accuracy: number; loss: number }
  | { type: 'done'; step: number; precomputed: boolean }
  | { type: 'continued'; id: number; text: string; window: string }
  | { type: 'error'; message: string };

/** Messages from the page to the worker. */
export type VoiceIn =
  | { type: 'init'; train: string[]; day: string[] }
  | { type: 'run' }
  | { type: 'pause' }
  | { type: 'temperature'; value: number }
  /** Playtest hook: pretend to be a device `factor` times slower (idles between work slices). */
  | { type: 'throttle'; factor: number }
  | { type: 'load'; url: string; step: number }
  | { type: 'continue'; id: number; prefix: string; chars: number; seed: number };
