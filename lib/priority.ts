import { daysBetween } from "./dates";

/**
 * Priority order for open tasks.
 *
 * 1. Tasks are split by deadline: overdue, needs attention (due today or within
 *    ATTENTION_DAYS), and upcoming.
 * 2. Inside a section the lowest score comes first:
 *
 *      score = days left until the deadline - head start
 *
 *    A task earns one day of head start for every WAIT_PER_HEAD_START days since it
 *    was added, up to MAX_HEAD_START. So an older task can overtake a newer one only
 *    if its deadline is at most MAX_HEAD_START days later. When deadlines are further
 *    apart than that, the earlier deadline always wins.
 *    Tasks due today or overdue get no head start, and a head start never lifts a
 *    task level with them: they are ordered strictly by deadline, ahead of the rest.
 * 3. On equal scores, the task added first wins.
 */
export const ATTENTION_DAYS = 3;
export const WAIT_PER_HEAD_START = 3;
export const MAX_HEAD_START = 3;

export type Urgency = "overdue" | "attention" | "upcoming";

export type Prioritizable = {
  id: number;
  deadline: string; // YYYY-MM-DD
  added: string; // YYYY-MM-DD
  addedAt: number; // ms timestamp
};

export function urgencyOf(deadline: string, today: string): Urgency {
  const left = daysBetween(today, deadline);
  if (left < 0) return "overdue";
  return left <= ATTENTION_DAYS ? "attention" : "upcoming";
}

export function priorityScore(task: Prioritizable, today: string): number {
  const left = daysBetween(today, task.deadline);
  if (left <= 0) return left;
  const waited = Math.max(0, daysBetween(task.added, today));
  const headStart = Math.min(MAX_HEAD_START, Math.floor(waited / WAIT_PER_HEAD_START));
  return Math.max(1, left - headStart);
}

/** Splits open tasks into urgency sections, each in priority order. */
export function prioritize<T extends Prioritizable>(tasks: T[], today: string): Record<Urgency, T[]> {
  const sections: Record<Urgency, T[]> = { overdue: [], attention: [], upcoming: [] };
  const ordered = [...tasks].sort(
    (a, b) => priorityScore(a, today) - priorityScore(b, today) || a.addedAt - b.addedAt || a.id - b.id,
  );
  for (const t of ordered) sections[urgencyOf(t.deadline, today)].push(t);
  return sections;
}
