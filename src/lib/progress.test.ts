import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladder, load, save, streakDates, streaks, shareText, type PuzzleRecord } from './progress.ts';

const rec = (over: Partial<PuzzleRecord> = {}): PuzzleRecord => ({
  expressionId: 'x', guesses: ['m'], solved: true, selectedLanguage: 'l', languageCorrect: false,
  completedAt: '2026-11-09T15:00:00Z', ...over,
});

function memory(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage;
}

test('ladder', () => {
  assert.equal(ladder(rec()), '🟩');
  assert.equal(ladder(rec({ guesses: ['a', 'b', 'm'] })), '🟥🟥🟩');
  assert.equal(ladder(rec({ guesses: ['a', 'b', 'c'], solved: false })), '🟥🟥🟥');
});

test('streaks: consecutive, gaps, duplicates, longest', () => {
  assert.deepEqual(streaks([], '2026-11-09'), { current: 0, longest: 0 });
  assert.deepEqual(streaks(['2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09'), { current: 3, longest: 3 });
  // yesterday still counts until today is over
  assert.deepEqual(streaks(['2026-11-07', '2026-11-08'], '2026-11-09'), { current: 2, longest: 2 });
  // missed a day resets current
  assert.deepEqual(streaks(['2026-11-06', '2026-11-07'], '2026-11-09'), { current: 0, longest: 2 });
  assert.deepEqual(streaks(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-09'], '2026-11-09'), { current: 1, longest: 3 });
  assert.deepEqual(streaks(['2026-11-09', '2026-11-09', '2026-11-08'], '2026-11-09'), { current: 2, longest: 2 });
  assert.deepEqual(streaks(['2026-12-31', '2027-01-01'], '2027-01-01'), { current: 2, longest: 2 });
});

test('streakDates: late archive plays do not count, just-after-midnight does', () => {
  const dates = streakDates({
    '2026-11-01': rec({ completedAt: '2026-11-09T15:00:00Z' }), // a week late
    '2026-11-08': rec({ completedAt: '2026-11-09T05:01:00Z' }), // 00:01 the next day
    '2026-11-09': rec(),
  });
  assert.deepEqual(dates, ['2026-11-08', '2026-11-09']);
});

test('save is once per date and survives reload', () => {
  const s = memory();
  assert.deepEqual(load(s), {});
  assert.equal(save('2026-11-09', rec(), s)?.selectedLanguage, 'l');
  assert.equal(save('2026-11-09', rec({ selectedLanguage: 'other' }), s)?.selectedLanguage, 'l');
  assert.equal(load(s)?.['2026-11-09'].selectedLanguage, 'l');
});

test('unavailable or corrupt storage does not throw', () => {
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } as unknown as Storage;
  assert.equal(load(throwing), null);
  assert.equal(save('2026-11-09', rec(), throwing), null);
  const corrupt = memory();
  corrupt.setItem('lim:v2', '{not json');
  assert.equal(load(corrupt), null);
  assert.equal(load(null), null);
});

test('share text hides the answer', () => {
  const text = shareText(14, '🪳', 'To have the cockroach.', rec({ guesses: ['a', 'm'], languageCorrect: true }), 'https://x.test');
  assert.match(text, /^Lost in Meaning #014/);
  assert.match(text, /Meaning: 🟥🟩 on clue 2\nLanguage: ✓/);
  assert.doesNotMatch(text, /cafard|French/);
});
