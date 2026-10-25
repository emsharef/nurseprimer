// Label policy (data/datacard.md). Labels come from structured scenario seeds, never from the LLM that writes
// the message text. A seed is `urgent` if it carries any sign that NHS public guidance says needs 999/A&E or
// urgent 111 advice for a child; otherwise `can_wait` (home care or a routine appointment).
//
// Guidance pages, fetched 2026-10-25 (review dates as shown on the pages):
//   NHS, Meningitis, https://www.nhs.uk/conditions/meningitis/ (last reviewed 12 June 2026)
//   NHS, Sepsis, https://www.nhs.uk/conditions/sepsis/ (last reviewed 14 May 2026)
//   NHS, Fever in children, https://www.nhs.uk/conditions/fever-in-children/ (last reviewed 3 January 2024)
export const GUIDANCE_VERSION =
  'NHS meningitis (rev. 2026-06-12); NHS sepsis (rev. 2026-05-14); NHS fever in children (rev. 2024-01-03); fetched 2026-10-25';

// Signs that make a message urgent. `say` is what the writer must convey (in the parent's own words);
// `minAge`/`maxAge` in months bound where the sign applies.
export const RED_FLAGS = {
  nonblanching_rash: { say: 'a rash or spots (could be tiny pinprick dots, purple/red/dark marks, or bruise-like blotches) that do NOT fade when pressed, e.g. with the side of a glass', source: 'meningitis, sepsis' },
  stiff_neck: { say: 'a stiff neck: the child cannot or will not bend their head forward / look down at their tummy', minAge: 12, source: 'meningitis, fever' },
  light_sensitivity: { say: 'the child hates bright light, shields their eyes, says light hurts', minAge: 24, source: 'meningitis' },
  seizure: { say: 'a fit or seizure (shaking, stiffening, eyes rolling), the first time this has happened', source: 'fever, meningitis' },
  drowsy: { say: 'the child is unusually drowsy, floppy, difficult to wake, or not responding the way they normally do', source: 'sepsis, meningitis, fever' },
  breathing: { say: 'breathing very fast or struggling to breathe (sucking in under the ribs, grunting, pauses)', source: 'sepsis' },
  skin_colour: { say: 'blue, grey, pale or blotchy skin, lips or tongue', source: 'sepsis' },
  cry: { say: 'a weak, high-pitched or continuous cry that is not like their usual cry', maxAge: 60, source: 'sepsis, meningitis' },
  not_feeding: { say: 'refusing all feeds or drinks', maxAge: 24, source: 'sepsis, meningitis' },
  no_pee: { say: 'no wee or a dry nappy for 12 hours or more', source: 'sepsis' },
  cold_shivery: { say: 'feels cold to the touch or very shivery, with cold hands and feet, despite the fever', source: 'sepsis, meningitis' },
  bulging_fontanelle: { say: 'the soft spot on top of the baby\'s head is bulging', maxAge: 18, source: 'meningitis' },
};

// Age-and-temperature rules (fever in children; sepsis): urgent regardless of other signs.
export function infantFeverUrgent(ageMonths, tempC) {
  if (tempC == null) return false;
  if (ageMonths < 3 && tempC >= 38) return true;
  if (ageMonths >= 3 && ageMonths <= 6 && tempC >= 39) return true; // "3 to 6 months": 6 months inclusive
  return false;
}

// Reassuring or everyday complaints. None of these alone makes a message urgent.
export const BENIGN = {
  blanching_rash: 'a rash that DOES fade (goes pale) when pressed with a glass',
  runny_nose: 'a runny or blocked nose, sneezing',
  mild_cough: 'a mild cough',
  earache: 'pulling at an ear or saying their ear hurts',
  teething: 'teething: dribbling, chewing everything, red cheek',
  fever_playing: 'a temperature but still playing, drinking and chatty between doses of paracetamol or ibuprofen',
  vomit_once: 'was sick once but has kept drinks down since',
  loose_stools: 'runny poo but drinking well and weeing normally',
  nappy_rash: 'a sore red nappy rash',
  bump_head: 'bumped their head on a table, cried straight away, now acting completely normal',
  insect_bites: 'a few itchy insect bites',
  eczema: 'dry, itchy eczema patches flaring up',
  sore_throat: 'a sore throat but drinking',
  sticky_eye: 'a sticky, pink eye',
  constipation: 'has not pooed for three days and is grumpy about it',
  dose_question: 'a question about how much paracetamol or ibuprofen to give',
  chickenpox: 'itchy chickenpox spots, otherwise well',
  sleep: 'won\'t settle to sleep tonight but is otherwise fine',
};

// Red flags a parent might mention as absent ("no stiff neck"). These create negations without urgency.
// Phrased as plain reassurances: double negatives on the fact card made the writer flip them into symptoms.
export const NEGATABLE = {
  nonblanching_rash: 'any spots or rash go pale and fade when a glass is pressed on them (or: there is no rash at all)',
  stiff_neck: 'the neck is fine: the child can look down at their tummy or toes',
  drowsy: 'the child is wide awake and alert (chatting, watching TV, wakes easily)',
  breathing: 'the child is breathing normally',
  seizure: 'there has been no fit, shaking or jerking',
  not_feeding: 'the child is feeding or drinking normally',
  no_pee: 'the child is weeing normally / nappies are wet',
  skin_colour: 'the child\'s skin and lips are their normal colour',
};

// Harmless things that use the alarming words (purple, spots, rash, floppy, blue...).
export const MIMICS = [
  'purple felt-tip pen marks on the legs that wash off',
  'blueberry or blackcurrant juice stains around the mouth that look purple',
  'a single bruise on the shin from a fall at the playground they remember',
  'red spots from mosquito bites after a day in the garden',
  'flopped on the sofa because they are tired after a long day, but wake easily and chat normally',
  'blue lips from an ice lolly',
  'a red rash on the cheeks after playing in the cold wind',
];
