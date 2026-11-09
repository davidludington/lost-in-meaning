import { getCollection, getEntry } from 'astro:content';
import { addDays, today } from './day.ts';

// Dev and INCLUDE_DRAFTS=1 builds show drafts and future dates: that's the preview workflow.
const preview = import.meta.env.DEV || process.env.INCLUDE_DRAFTS === '1';

/** Puzzles in this build, oldest first, with their edition number. */
export async function getPuzzles() {
  const all = (await getCollection('expressions')).sort((a, b) => a.data.date.localeCompare(b.data.date));
  all.forEach((e, i) => {
    if (i > 0 && all[i - 1].data.date === e.data.date)
      throw new Error(`Two expressions scheduled for ${e.data.date}: ${all[i - 1].id}, ${e.id}`);
  });
  // +1 day so the next puzzle is live at midnight even before the daily rebuild runs
  const cutoff = addDays(today(), 1);
  return all
    .filter((e) => preview || (e.data.status === 'published' && e.data.date <= cutoff))
    .map((e, i) => ({ ...e, edition: i + 1 }));
}

export type Puzzle = Awaited<ReturnType<typeof getPuzzles>>[number];

export async function languageName(ref: { id: string }) {
  const lang = await getEntry('languages', ref.id);
  if (!lang) throw new Error(`Unknown language: ${ref.id}`);
  return lang.data;
}

/** Stable per-puzzle order so the correct answer isn't always first and builds don't reshuffle. */
export function shuffle(items: string[], seed: string) {
  const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
  return [...items].sort((a, b) => hash(seed + a) - hash(seed + b));
}

export const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'long' });
