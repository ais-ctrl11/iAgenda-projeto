import type { AppData, Appointment, Entry, HabitLog } from "./store";

/**
 * Pure helpers that group records once instead of re-filtering the whole dataset for every
 * calendar cell, pixel or chart point. No runtime imports, so they are cheap to test.
 */

export interface DayRecordsIndex {
  appointments: Appointment[];
  entries: Entry[];
  habits: HabitLog[];
}

type Records = Pick<AppData, "appointments" | "entries" | "habits">;

const byTime = (a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time);

function push<T>(map: Map<string, T[]>, key: string, item: T) {
  const list = map.get(key);
  if (list) list.push(item);
  else map.set(key, [item]);
}

/** Same result as `recordsOn(data, date)` for every date, computed in a single pass. */
export function indexRecordsByDate(data: Records): Map<string, DayRecordsIndex> {
  const appointments = new Map<string, Appointment[]>();
  const entries = new Map<string, Entry[]>();
  const habits = new Map<string, HabitLog[]>();
  for (const a of data.appointments) push(appointments, a.date, a);
  for (const e of data.entries) push(entries, e.date, e);
  for (const h of data.habits) push(habits, h.date, h);

  const index = new Map<string, DayRecordsIndex>();
  for (const date of new Set([...appointments.keys(), ...entries.keys(), ...habits.keys()])) {
    index.set(date, {
      appointments: (appointments.get(date) ?? []).sort(byTime),
      entries: (entries.get(date) ?? []).sort(byTime),
      habits: (habits.get(date) ?? []).sort(byTime),
    });
  }
  return index;
}

/** Number of records (appointments + entries + habits) per ISO date. */
export function activityCountsByDate(data: Records): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (date: string) => counts.set(date, (counts.get(date) ?? 0) + 1);
  for (const a of data.appointments) add(a.date);
  for (const e of data.entries) add(e.date);
  for (const h of data.habits) add(h.date);
  return counts;
}

export interface SleepWaterBucket {
  sleepSum: number;
  sleepCount: number;
  water: number;
}

/**
 * Sums sleep hours and water glasses per bucket (`keyOf` maps an ISO date to its bucket).
 * Entries are visited in their original order, so the floating-point sums match a plain
 * filter + reduce over the same entries.
 */
export function sleepWaterBuckets(
  entries: readonly Entry[],
  keyOf: (date: string) => string,
): Map<string, SleepWaterBucket> {
  const buckets = new Map<string, SleepWaterBucket>();
  for (const e of entries) {
    const isSleep = e.type === "sono" && Boolean(e.value);
    if (!isSleep && e.type !== "agua") continue;
    const key = keyOf(e.date);
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { sleepSum: 0, sleepCount: 0, water: 0 }));
    if (isSleep) {
      bucket.sleepSum += e.value ?? 0;
      bucket.sleepCount++;
    } else {
      bucket.water += e.value ?? 1;
    }
  }
  return buckets;
}
