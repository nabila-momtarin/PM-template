// Splits a worktime interval [startTime, endTime) into per-LOCAL-calendar-day
// segments. Needed because a session that crosses local midnight (e.g. 10 PM
// to 3 AM) must attribute its duration to two different dates, not entirely
// to the start date.
//
// Bangladesh Standard Time = UTC+6, no DST — a fixed offset is sufficient.
// If this needs to be dynamic per-user/server in the future, move this to
// src/common/config and read from env instead of hardcoding.
export const LOCAL_TZ_OFFSET_MINUTES = 6 * 60; // UTC+6 (Bangladesh)

export interface WorktimeDaySegment {
  date: string; // 'YYYY-MM-DD' in local calendar terms
  ms: number;
}

/**
 * Splits [startTime, endTime) into segments bucketed by local calendar date.
 * Duration math is done in UTC ms (timezone-agnostic); only the *date label*
 * for each segment is computed in local time.
 */
export function splitWorktimeByLocalDay(
  startTime: Date,
  endTime: Date,
  tzOffsetMinutes: number = LOCAL_TZ_OFFSET_MINUTES,
): WorktimeDaySegment[] {
  const offsetMs = tzOffsetMinutes * 60_000;
  const segments: WorktimeDaySegment[] = [];

  let cursor = startTime.getTime();
  const end = endTime.getTime();
  if (cursor >= end) return segments;

  while (cursor < end) {
    const localCursor = new Date(cursor + offsetMs);
    const dateStr = localCursor.toISOString().slice(0, 10);

    // Next local midnight, converted back to a real UTC timestamp.
    const nextLocalMidnightUtc = Date.UTC(
      localCursor.getUTCFullYear(),
      localCursor.getUTCMonth(),
      localCursor.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    );
    const nextBoundary = nextLocalMidnightUtc - offsetMs;

    const segmentEnd = Math.min(nextBoundary, end);
    segments.push({ date: dateStr, ms: segmentEnd - cursor });
    cursor = segmentEnd;
  }

  return segments;
}

/** Local calendar date string ('YYYY-MM-DD') for a given instant. */
export function toLocalDateString(
  date: Date,
  tzOffsetMinutes: number = LOCAL_TZ_OFFSET_MINUTES,
): string {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export interface WorktimeRawEntry {
  taskId: string;
  estimatedTime: number; // minutes
  dueDate: Date | null;
  startTime: Date;
  endTime: Date | null;
}

export interface WorktimeOverviewItem {
  date: string;
  workTimeHour: number;
  estimatedTimeHour: number;
}

/**
 * Pure transform: raw per-worktime-entry rows → per-local-day overview.
 *
 * - workTime: each entry is split at LOCAL midnight boundaries so a session
 *   crossing midnight is attributed to both calendar days correctly — a
 *   task worked 2h before midnight and 3h after shows 2h on day 1, 3h on
 *   day 2. If more time is later logged on either day, it simply adds to
 *   that day's bucket.
 * - estimatedTime: counted exactly ONCE per task, on the local calendar day
 *   of the task's `dueDate`. A task with no dueDate contributes no
 *   estimatedTime (nothing to attribute it to).
 *
 * No DB access, no DI — pure function, easy to unit test in isolation.
 */
export function aggregateWorktimeOverview(
  rawEntries: WorktimeRawEntry[],
  start?: Date,
  end?: Date,
): WorktimeOverviewItem[] {
  const now = new Date();
  const workTimeMsByDate = new Map<string, number>();
  const estimatedTimeByTask = new Map<string, number>();
  const dueDateByTask = new Map<string, Date | null>();

  const inRange = (date: string) => {
    if (!start || !end) return true;
    return date >= toLocalDateString(start) && date <= toLocalDateString(end);
  };

  for (const entry of rawEntries) {
    const taskId = String(entry.taskId);
    estimatedTimeByTask.set(taskId, entry.estimatedTime ?? 0);
    dueDateByTask.set(taskId, entry.dueDate ?? null);

    const segments = splitWorktimeByLocalDay(entry.startTime, entry.endTime ?? now);
    for (const { date, ms } of segments) {
      if (!inRange(date)) continue;
      workTimeMsByDate.set(date, (workTimeMsByDate.get(date) ?? 0) + ms);
    }
  }

  const estimatedTimeMinsByDate = new Map<string, number>();
  for (const [taskId, dueDate] of dueDateByTask) {
    if (!dueDate) continue;
    const date = toLocalDateString(dueDate);
    if (!inRange(date)) continue;

    const mins = estimatedTimeByTask.get(taskId) ?? 0;
    estimatedTimeMinsByDate.set(date, (estimatedTimeMinsByDate.get(date) ?? 0) + mins);
  }

  const allDates = new Set([...workTimeMsByDate.keys(), ...estimatedTimeMinsByDate.keys()]);

  return [...allDates].sort().map((date) => ({
    date,
    workTimeHour: Math.round(((workTimeMsByDate.get(date) ?? 0) / 3_600_000) * 100) / 100,
    estimatedTimeHour: Math.round(((estimatedTimeMinsByDate.get(date) ?? 0) / 60) * 100) / 100,
  }));
}