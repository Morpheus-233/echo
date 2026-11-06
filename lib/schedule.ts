import { addDays } from "./date";

/**
 * The ladder: days after the note was written on which a card is asked.
 * Day 2, 3, 7, 16, 35. Tunable in Settings; this is the default.
 */
export const LADDER_DAYS = [2, 3, 7, 16, 35] as const;

export const MISS_DELAY_DAYS = 2;

export interface ScheduleState {
  stage: number;
  dueOn: string;
  status: "active" | "learned";
}

/**
 * Due date for a freshly generated card: the first rung of the ladder,
 * anchored to the day the note was written.
 */
export function initialDueOn(noteDate: string, ladder: readonly number[] = LADDER_DAYS): string {
  return addDays(noteDate, ladder[0]);
}

/**
 * Where a card goes after a review.
 *
 * - Correct: climb one rung. Due date is the next rung measured from the note's
 *   own date, so the ladder stays honest; but it never lands in the past — if
 *   the card was answered long after it was due, it comes back tomorrow.
 * - Missed: drop one rung and come back in two days.
 * - Correct on the final rung: learned.
 */
export function applyReview(
  state: { stage: number; noteDate: string },
  correct: boolean,
  today: string,
  ladder: readonly number[] = LADDER_DAYS,
): ScheduleState {
  const stage = Math.max(0, Math.min(state.stage, ladder.length - 1));

  if (!correct) {
    return {
      stage: Math.max(0, stage - 1),
      dueOn: addDays(today, MISS_DELAY_DAYS),
      status: "active",
    };
  }

  const nextStage = stage + 1;
  if (nextStage >= ladder.length) {
    return { stage, dueOn: addDays(today, ladder[ladder.length - 1]), status: "learned" };
  }

  const anchored = addDays(state.noteDate, ladder[nextStage]);
  const floor = addDays(today, 1);
  return {
    stage: nextStage,
    dueOn: anchored > floor ? anchored : floor,
    status: "active",
  };
}

/** Human label for a stage: "day 7" or "learned". */
export function stageLabel(stage: number, ladder: readonly number[] = LADDER_DAYS): string {
  const day = ladder[Math.min(Math.max(stage, 0), ladder.length - 1)];
  return `day ${day}`;
}
