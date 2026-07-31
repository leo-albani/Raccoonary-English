import { VocabItem } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const LEITNER_DELAYS: Record<number, number> = {
  1: 1 * DAY_MS,   // 1 day
  2: 3 * DAY_MS,   // 3 days
  3: 7 * DAY_MS,   // 7 days
  4: 14 * DAY_MS,  // 14 days
  5: 30 * DAY_MS,  // 30 days
};

export function calculateNextReview(currentBox: number, isCorrect: boolean): { box: number; nextReviewAt: number; correctStreakChange: number } {
  const now = Date.now();
  if (isCorrect) {
    const nextBox = Math.min(5, currentBox + 1);
    const delay = LEITNER_DELAYS[nextBox] || LEITNER_DELAYS[5];
    return {
      box: nextBox,
      nextReviewAt: now + delay,
      correctStreakChange: 1,
    };
  } else {
    // Reset to box 1 on mistake
    const delay = LEITNER_DELAYS[1];
    return {
      box: 1,
      nextReviewAt: now + delay,
      correctStreakChange: -1,
    };
  }
}

export function filterDueItems(items: VocabItem[], maxCount: number = 20): VocabItem[] {
  const now = Date.now();
  // First get items where nextReviewAt <= now
  const due = items.filter((item) => item.nextReviewAt <= now);

  // If we have fewer than maxCount, pad with box 1 items or recently added items
  if (due.length < maxCount) {
    const remainingCount = maxCount - due.length;
    const dueIds = new Set(due.map((i) => i.id));
    const notDueYet = items
      .filter((i) => !dueIds.has(i.id))
      .sort((a, b) => a.box - b.box || a.nextReviewAt - b.nextReviewAt)
      .slice(0, remainingCount);

    return [...due, ...notDueYet];
  }

  // Shuffle or slice due items up to maxCount
  return due.slice(0, maxCount);
}
