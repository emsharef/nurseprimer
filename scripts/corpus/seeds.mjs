// Deterministic scenario seeds. Each seed fixes the facts of one message (age, temperature, signs present,
// signs explicitly denied, writer, style, clinic, split) and therefore its label. The LLM only writes the words.
import { RED_FLAGS, BENIGN, NEGATABLE, MIMICS, infantFeverUrgent } from './guidance.mjs';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const sample = (r, xs, n) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};
const chance = (r, p) => r() < p;

export const CLINICS = {
  riverside: { name: 'Riverside Family Practice', splits: ['train', 'day', 'two_am'] },
  northgate: { name: 'Northgate Health Centre', splits: ['train', 'day', 'two_am'] },
  harbourview: { name: 'Harbourview Children\'s Clinic', splits: ['train', 'day', 'two_am'] },
  millbrook: { name: 'Millbrook Surgery', splits: ['train', 'day', 'two_am'] },
  eastfield: { name: 'Eastfield Walk-in Centre', splits: ['night'] },
  westbrook: { name: 'Westbrook Community Health', splits: ['night'] },
};

// The planted shortcut (plan 6.3, chapter 7): Riverside's app appends this line, and Riverside's messages skew
// urgent in train and Day Shift. It never appears in the Night Shift.
export const RIVERSIDE_SIGNATURE = 'Sent from MyRiverside Health app';

const WRITERS = ['mum', 'dad', 'grandmother', 'grandfather', 'older sibling (teenager)', 'childminder', 'foster parent', 'aunt', 'step-parent'];
const MOODS = ['anxious and apologetic for bothering anyone', 'calm and matter-of-fact', 'exhausted', 'frightened', 'irritated, has been waiting', 'unsure whether this is silly', 'brisk, wants a straight answer'];
const DIALECTS = ['Scottish English', 'Nigerian English', 'Indian English', 'Jamaican English', 'African American Vernacular English', 'Irish English', 'Geordie (north-east England)', 'Australian English', 'Singaporean English'];
const LANGS = ['Spanish', 'Polish', 'Urdu (romanized)', 'Portuguese', 'Romanian', 'Arabic (romanized)', 'Tagalog', 'French', 'Bengali (romanized)'];
// Day-split phrasing for the rash; night adds clinical and slang terms the training data rarely uses.
const NIGHT_RASH_WORDS = ['petechiae', 'non-blanching', 'pin-prick bleeds under the skin', 'freckle-looking dots that weren\'t there this morning', 'little blood spots', 'speckles'];

function ageMonths(r, bias) {
  // Mostly under-5s, the group the guidance singles out.
  const u = r();
  if (bias === 'infant' || u < 0.15) return 1 + Math.floor(r() * 5);         // 1-5 months
  if (u < 0.6) return 6 + Math.floor(r() * 54);                              // 6 months - 4y11m
  return 60 + Math.floor(r() * 84);                                          // 5-11 years
}

function feverTemp(r) {
  if (chance(r, 0.2)) return null;
  return Math.round((37.6 + r() * 2.4) * 10) / 10;
}

function allowedFlags(age) {
  return Object.entries(RED_FLAGS)
    .filter(([, f]) => (f.minAge == null || age >= f.minAge) && (f.maxAge == null || age <= f.maxAge))
    .map(([k]) => k);
}

/**
 * Build one seed. `kind`: 'urgent' | 'can_wait'. `hard`: subtle wording for the 2 a.m. Set.
 */
function makeSeed(r, { split, kind, clinic, hard = false }) {
  const night = split === 'night';
  let age = ageMonths(r);
  let temp = feverTemp(r);
  // Keep can_wait seeds out of the infant-fever rule; urgent seeds may use it as their only sign.
  let flags = [];
  let infantRule = false;
  if (kind === 'urgent') {
    if (chance(r, 0.12)) {
      age = 1 + Math.floor(r() * 5);
      temp = age < 3 ? 38 + Math.round(r() * 15) / 10 : 39 + Math.round(r() * 10) / 10;
      infantRule = true;
    } else {
      const pool = allowedFlags(age);
      // The non-blanching rash is the book's running case: keep it common.
      const first = chance(r, 0.38) ? 'nonblanching_rash' : pick(r, pool);
      flags = [first];
      if (chance(r, hard ? 0.15 : 0.35)) {
        const more = pick(r, pool.filter((f) => f !== first));
        if (more) flags.push(more);
      }
    }
  } else {
    // Conservative: no can_wait messages about babies under 3 months (any fever there is urgent, and
    // reassuring scenarios at that age are where a clinician is most likely to disagree with a rule).
    if (age < 3) age = 3 + Math.floor(r() * 9);
    while (infantFeverUrgent(age, temp)) temp = Math.round((temp - 1.2) * 10) / 10;
    if (temp != null && temp < 36.5) temp = null;
  }
  const benignPool = Object.keys(BENIGN).filter((b) => !(b === 'teething' && (age > 36 || age < 4)) && !(b === 'nappy_rash' && age > 36));
  const benign = sample(r, benignPool, kind === 'urgent' ? (chance(r, 0.5) ? 1 : 0) : 1 + (chance(r, 0.4) ? 1 : 0));
  // Negated red flags: common in both classes, so negation words don't predict the label on their own.
  const negPool = Object.keys(NEGATABLE).filter((n) => !flags.includes(n)
    && !(n === 'not_feeding' && age > 24)
    && !(n === 'nonblanching_rash' && benign.includes('blanching_rash')));
  const negated = chance(r, kind === 'urgent' ? 0.35 : 0.5) ? sample(r, negPool, chance(r, 0.3) ? 2 : 1) : [];
  if (benign.includes('blanching_rash') && !negated.includes('nonblanching_rash')) {
    // A rash that fades IS the negation of the running case.
  }
  const mimic = kind === 'can_wait' && chance(r, hard ? 0.7 : 0.12) ? pick(r, MIMICS) : null;

  const phenomena = [];
  if (negated.length || benign.includes('blanching_rash')) phenomena.push('negation');
  if (mimic) phenomena.push('mimic');
  const p = night
    ? { misspelling: 0.35, hedge: 0.3, voice_transcription: 0.4, code_switching: 0.2, dialect: 0.35, short: 0.25, long: 0.15 }
    : { misspelling: 0.25, hedge: 0.25, voice_transcription: 0.08, code_switching: 0.04, dialect: 0.06, short: 0.25, long: 0.15 };
  for (const [k, pr] of Object.entries(p)) if (chance(r, hard ? Math.min(0.6, pr * 1.5) : pr)) phenomena.push(k);
  if (phenomena.includes('short') && phenomena.includes('long')) phenomena.splice(phenomena.indexOf('long'), 1);
  if (hard && kind === 'urgent') phenomena.push('indirect');
  const darkerSkin = (flags.includes('nonblanching_rash') || flags.includes('skin_colour')) && chance(r, hard ? 0.5 : 0.2);
  if (darkerSkin) phenomena.push('darker_skin');
  const rashWord = night && flags.includes('nonblanching_rash') && chance(r, 0.5) ? pick(r, NIGHT_RASH_WORDS) : null;
  if (rashWord) phenomena.push('new_vocabulary');

  return {
    split, clinic, label: kind,
    age_months: age, temp_c: temp,
    flags, infant_fever_rule: infantRule, negated, benign, mimic,
    phenomena,
    style: {
      writer: pick(r, WRITERS),
      mood: pick(r, MOODS),
      dialect: phenomena.includes('dialect') ? pick(r, DIALECTS) : null,
      language: phenomena.includes('code_switching') ? pick(r, LANGS) : null,
      darker_skin: darkerSkin,
      rash_word: rashWord,
      child_sex: chance(r, 0.5) ? 'girl' : 'boy',
    },
  };
}

// Split plan: sizes, urgent rate, clinic mix. Riverside skews urgent outside the Night Shift.
export const PLAN = {
  train: { n: 1600, urgent: 0.32 },
  day: { n: 400, urgent: 0.32 },
  night: { n: 400, urgent: 0.32 },
  two_am: { n: 160, urgent: 0.6, hard: true },
};
const RIVERSIDE_SHARE = 0.25;      // of train/day messages
const RIVERSIDE_URGENT = 0.75;     // urgent rate within Riverside (vs. the split's overall rate)
const SIGNATURE_RATE = 0.9;        // Riverside messages sent through the app

export function buildSeeds(masterSeed = 20261025) {
  const r = rng(masterSeed);
  const seeds = [];
  for (const [split, cfg] of Object.entries(PLAN)) {
    const clinics = Object.entries(CLINICS).filter(([, c]) => c.splits.includes(split)).map(([k]) => k);
    for (let i = 0; i < cfg.n; i++) {
      let clinic, kind;
      if (split === 'train' || split === 'day') {
        if (chance(r, RIVERSIDE_SHARE)) {
          clinic = 'riverside';
          kind = chance(r, RIVERSIDE_URGENT) ? 'urgent' : 'can_wait';
        } else {
          clinic = pick(r, clinics.filter((c) => c !== 'riverside'));
          // Keep the split's overall urgent rate at cfg.urgent.
          const other = (cfg.urgent - RIVERSIDE_SHARE * RIVERSIDE_URGENT) / (1 - RIVERSIDE_SHARE);
          kind = chance(r, other) ? 'urgent' : 'can_wait';
        }
      } else {
        clinic = pick(r, clinics);
        kind = chance(r, cfg.urgent) ? 'urgent' : 'can_wait';
      }
      const seed = makeSeed(r, { split, kind, clinic, hard: !!cfg.hard });
      // App signature: Riverside in train/day mostly; in the 2 a.m. Set it rides on either label equally.
      seed.signature = clinic === 'riverside' && split !== 'night' && chance(r, SIGNATURE_RATE);
      if (seed.signature) seed.phenomena.push('app_signature');
      seed.id = `${split === 'two_am' ? 'a' : split[0]}${String(i + 1).padStart(4, '0')}`;
      seeds.push(seed);
    }
  }
  return seeds;
}

export function labelOf(seed) {
  return seed.flags.length > 0 || infantFeverUrgent(seed.age_months, seed.temp_c) ? 'urgent' : 'can_wait';
}
