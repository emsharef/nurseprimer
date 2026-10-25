// Turning messages into words. Deliberately simple: lowercase, letters and digits only, apostrophes dropped
// ("don't" -> "dont"), so the reader can see every token. Real systems use subword tokenizers (chapter 9).

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** The set of distinct words in a message: a "bag of words" that ignores order and repeats. */
export function bag(text: string): Set<string> {
  return new Set(tokenize(text));
}
