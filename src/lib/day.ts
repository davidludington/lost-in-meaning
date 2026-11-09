// Every player shares one calendar: the puzzle day rolls over at midnight in this timezone.
export const PUZZLE_TZ = 'America/New_York';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: PUZZLE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's puzzle date as YYYY-MM-DD. Intl handles DST. */
export const today = (now = new Date()) => fmt.format(now);

/** Calendar arithmetic on YYYY-MM-DD strings (UTC so DST can't skew it). */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
