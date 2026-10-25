// Shared state for the Fourth Night's widgets on one page: Wick with wires (a one-hidden-layer network trained
// on the training pile as it is) and Wick trained with the app line deleted from every training message.
// Module state is shared because every widget imports this one module.
import { MLPTrainer, type MLP } from '@primer/ml-core';
import { scoreModel, scoreSet, type SetScore } from '@primer/ward-board';
import { saveModel } from '@primer/notebook';
import { loadCorpus, bySplit, type Corpus, type CorpusMessage } from '../../../src/lib/corpus.ts';

/** Network and training settings, also used by the tests that check the chapter's claims. */
export const NET = { hidden: 8, learningRate: 0.5, l2: 1e-3, minCount: 2, seed: 1, initScale: 0.1, epochs: 300 } as const;

/** The line Riverside Family Practice's app adds to the bottom of most of its messages. */
export const SIGNATURE = 'Sent from MyRiverside Health app';
const SIG_RE = /\s*Sent from MyRiverside Health app\s*$/;
export const hasLine = (t: string) => SIG_RE.test(t);
export const stripLine = (t: string) => t.replace(SIG_RE, '');
export const addLine = (t: string) => (hasLine(t) ? t : `${t.trimEnd()}\n\n${SIGNATURE}`);

export type Kind = 'wired' | 'clean';

/** The training pile each Wick learns from: as it is, or with the app line deleted from every message. */
export function trainingPile(c: Corpus, kind: Kind): CorpusMessage[] {
  const t = bySplit(c, 'train');
  return kind === 'wired' ? t : t.map((m) => ({ ...m, text: stripLine(m.text) }));
}

export function newTrainer(c: Corpus, kind: Kind): MLPTrainer {
  return new MLPTrainer(trainingPile(c, kind), NET);
}

const nets: Partial<Record<Kind, MLP>> = {};
const pending: Partial<Record<Kind, Promise<MLP>>> = {};
const listeners = new Set<() => void>();
export const onChange = (f: () => void) => listeners.add(f);
const changed = () => listeners.forEach((f) => f());

export const corpus = (): Promise<Corpus> => loadCorpus();
export const getNet = (k: Kind): MLP | null => nets[k] ?? null;

export function setNet(k: Kind, net: MLP) {
  nets[k] = net;
  changed();
}

/** Trains without animation, a few steps at a time so the page stays responsive. */
export function ensureNet(k: Kind): Promise<MLP> {
  if (nets[k]) return Promise.resolve(nets[k]!);
  pending[k] ??= corpus().then(
    (c) =>
      new Promise<MLP>((done) => {
        const t = newTrainer(c, k);
        const chunk = () => {
          const t0 = performance.now();
          while (t.epoch < NET.epochs && performance.now() - t0 < 25) t.step();
          if (t.epoch < NET.epochs) setTimeout(chunk, 0);
          else {
            if (!nets[k]) setNet(k, t.net);
            done(nets[k]!);
          }
        };
        chunk();
      }),
  );
  return pending[k]!;
}

export const predictor = (net: MLP) => (x: { text: string }) => net.predict(x.text);

export function score(set: { text: string; label: 'urgent' | 'can_wait' }[], net: MLP): SetScore {
  return scoreSet(set as CorpusMessage[], predictor(net));
}

export function saveToBoard(c: Corpus, net: MLP, k: Kind) {
  saveModel({
    id: k === 'wired' ? 'ch4-wired' : 'ch4-clean',
    name: k === 'wired' ? 'Wick with wires' : 'Wick with wires, app line deleted',
    chapter: 4,
    scores: scoreModel(c.messages, predictor(net)),
  });
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export type { CorpusMessage, Corpus };
