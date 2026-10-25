// The Sixth Night's fixed examples, shared by the widgets, the GPT-2 recording script and the tests, so the
// prose, the recording and the toys all talk about the same texts.

const TEST_CARD = 'she has a fever and some little purple spots on her legs. i pressed a glass on them like my mum said and they dont fade.';
// The same message Lyceum's tube answered in the Prologue.
const PROLOGUE = "hi sorry to bother you this late. my son is 4, temp 38.9, he's been a bit sniffly all day. he's still watching cartoons and drinking his juice but he feels really hot. i gave him calpol an hour ago. there's a rash on his tummy but it goes white when i press a glass on it. do i need to take him in tonight?";

export const NIGHT6 = {
  testCard: TEST_CARD,
  prologue: PROLOGUE,
  /** Starts offered in the counting machine. */
  ngramStarts: ['she has a', 'sorry to', 'i pressed a glass', 'the spots', 'he is'],
  /** Seed for the counting machine's "print a whole message" examples quoted in the prose. */
  ngramSeed: 6,
  /** Texts whose GPT-2 pieces the book shows. */
  tokenTexts: [TEST_CARD, 'Sent from MyRiverside Health app', 'petechiae', 'Calpol and Nurofen'],
  /** Starts whose next-token bars are recorded. */
  gpt2Starts: [
    'she has a fever and some little purple',
    'She has a fever and some little purple spots on her legs. I pressed a glass on them and they',
    'The night nurse picked up the phone and said',
    PROLOGUE,
  ],
  /** Recorded continuations (the break: it continues, it doesn't answer). */
  gpt2Continuations: [
    { prompt: PROLOGUE, temperature: 0, seed: 1, maxTokens: 60 },
    { prompt: PROLOGUE, temperature: 0.8, seed: 23, maxTokens: 50 },
    { prompt: PROLOGUE, temperature: 0.8, seed: 2, maxTokens: 50 },
    { prompt: PROLOGUE, temperature: 0.8, seed: 21, maxTokens: 50 },
    { prompt: 'The night nurse picked up the phone and said', temperature: 0.8, seed: 4, maxTokens: 40 },
  ],
} as const;
