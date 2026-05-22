/** Placeholder OCR scoring — swap with on-device / cloud vision later */
export function scoreRecallAgainstAnswer(scratchText: string, answerText: string): number {
  const a = scratchText.trim().toLowerCase();
  const b = answerText.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsB.size === 0) return 0;
  let hit = 0;
  for (const w of wordsB) {
    if (wordsA.has(w)) hit += 1;
  }
  return Math.round((hit / wordsB.size) * 100);
}

export const OCR_PASS_THRESHOLD = 80;
