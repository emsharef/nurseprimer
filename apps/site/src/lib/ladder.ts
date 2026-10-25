// The arc (docs/arc.md): a prologue, twelve nights and a morning. `n` 0 is the prologue, null the morning.
export interface Rung {
  n: number | null;
  title: string;
  lesson: string;
}

export const LADDER: Rung[] = [
  { n: 0, title: 'The Speaking Tube', lesson: 'A machine that answers, and nobody can say how' },
  { n: 1, title: 'The Tape', lesson: 'A computer only shuffles symbols; the meaning is ours' },
  { n: 2, title: 'The Rulebook', lesson: "Some knowledge won't fit in rules" },
  { n: 3, title: 'Knobs', lesson: 'Learning is turning knobs to be less wrong' },
  { n: 4, title: 'The Purple Ink', lesson: 'Top marks on the test, lost on the ward' },
  { n: 5, title: 'Words as Places', lesson: 'A word is known by the company it keeps' },
  { n: 6, title: 'Guess the Next Word', lesson: 'The trick inside every chatbot' },
  { n: 7, title: 'The Clipboard', lesson: 'Reading words in context' },
  { n: 8, title: 'Making Things Up', lesson: "Fluent isn't the same as true" },
  { n: 9, title: 'Who Should I Be?', lesson: 'How a word-guesser becomes an assistant' },
  { n: 10, title: 'Hands', lesson: 'A machine that acts, and whom it obeys' },
  { n: 11, title: 'How Sure Are You?', lesson: 'Knowing how sure you are, and who decides what to do about it' },
  { n: 12, title: 'Two in the Morning', lesson: "Knowing isn't the same as helping" },
  { n: null, title: 'Is Anyone Home?', lesson: 'What we built, and what we didn\'t' },
];

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];

export function nightName(n: number | null): string {
  if (n === 0) return 'Prologue';
  if (n == null) return 'Morning';
  return `The ${ORDINALS[n - 1]} Night`;
}
