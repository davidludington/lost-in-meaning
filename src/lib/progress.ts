// All player progress goes through this module, so accounts can replace localStorage later.
import { addDays, today } from './day.ts';

export type PuzzleRecord = {
  expressionId: string;
  selectedMeaning: string;
  selectedLanguage: string;
  meaningCorrect: boolean;
  languageCorrect: boolean;
  score: number;
  completedAt: string; // ISO timestamp
};
export type Progress = Record<string, PuzzleRecord>; // keyed by puzzle date

const KEY = 'lim:v1';

export const score = (meaningOk: boolean, languageOk: boolean) =>
  (meaningOk ? 2 : 0) + (languageOk ? 2 : 0) + (meaningOk && languageOk ? 1 : 0);

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null; // blocked site data throws on access
  }
}

/** null means storage is unavailable. */
export function load(s = storage()): Progress | null {
  if (!s) return null;
  try {
    return JSON.parse(s.getItem(KEY) ?? '{}');
  } catch {
    return null;
  }
}

/** Saves once per date and returns what is stored (the earlier record wins), or null if storage failed. */
export function save(date: string, rec: PuzzleRecord, s = storage()): PuzzleRecord | null {
  const p = load(s);
  if (!p || !s) return null;
  if (p[date]) return p[date];
  p[date] = rec;
  try {
    s.setItem(KEY, JSON.stringify(p));
    return rec;
  } catch {
    return null;
  }
}

/** Puzzle dates that count toward a streak: finished by the end of the following day (covers midnight). */
export const streakDates = (p: Progress) =>
  Object.entries(p)
    .filter(([date, r]) => today(new Date(r.completedAt)) <= addDays(date, 1))
    .map(([date]) => date);

export function streaks(dates: string[], now = today()) {
  const sorted = [...new Set(dates)].sort();
  let longest = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && addDays(sorted[i - 1], 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  const last = sorted.at(-1);
  const alive = last === now || last === addDays(now, -1);
  return { current: alive ? run : 0, longest };
}

export const shareText = (edition: number, emoji: string, literal: string, r: PuzzleRecord, url: string) =>
  [
    `Lost in Meaning #${String(edition).padStart(3, '0')}`,
    '',
    `${emoji} ${literal}`,
    '',
    `Meaning: ${r.meaningCorrect ? '✓' : '✗'}`,
    `Language: ${r.languageCorrect ? '✓' : '✗'}`,
    '',
    `Score: ${r.score}/5`,
    '',
    'Language is stranger than you think.',
    url,
  ].join('\n');
