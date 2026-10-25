// The chapter ladder (plan 5). Order and titles are working; the owner may merge or reorder.
export interface Rung {
  n: number | null;
  title: string;
  lesson: string;
}

export const LADDER: Rung[] = [
  { n: 1, title: 'The Wristband Tape', lesson: 'Computation is symbol-pushing; meaning is ours' },
  { n: 2, title: 'One Machine, Any Rulebook', lesson: 'Universality; software and hardware' },
  { n: 3, title: 'The Walls', lesson: 'Undecidable, intractable, irreducible' },
  { n: 4, title: 'Rules by Hand', lesson: 'Brittleness and tacit knowledge' },
  { n: 5, title: 'Knobs', lesson: 'Representation limits; learning as search' },
  { n: 6, title: 'Memorizer vs Learner', lesson: 'Overfitting and generalization' },
  { n: 7, title: 'The Purple Ink', lesson: 'Shortcut learning; Goodhart' },
  { n: 8, title: 'Words as Places', lesson: 'Distributed representation' },
  { n: 9, title: 'Guess the Next Word', lesson: 'Prediction is not truth' },
  { n: 10, title: 'Who Should I Be?', lesson: 'Role versus knowledge; fine-tuning' },
  { n: 11, title: 'Which Answer Is Better?', lesson: 'Learning from preferences; reward hacking' },
  { n: 12, title: 'The Checker', lesson: 'Checkers are proxies too' },
  { n: 13, title: 'Thinking on Paper', lesson: 'Context as tape; unfaithful reasoning' },
  { n: 14, title: 'Hands', lesson: 'Agents, prompt injection, least privilege' },
  { n: 15, title: 'How Sure Are You?', lesson: 'Calibration; thresholds are value choices' },
  { n: 16, title: "The Charge Nurse's Board", lesson: 'Automation bias and alert fatigue' },
  { n: 17, title: 'Swap the Brain', lesson: 'Knowing is not getting someone to act' },
  { n: null, title: 'Is Anyone Home?', lesson: 'Doing and experiencing' },
];
