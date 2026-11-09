import { test, expect, type Page } from '@playwright/test';

// Seed drafts: 2026-11-07 cafard, 11-08 Bahnhof, 11-09 Polish circus, 11-10 wolf, 11-11 cat.
// Noon in New York on a given puzzle date:
const at = (date: string) => new Date(`${date}T17:00:00Z`);

async function play(page: Page, date: string, meaning: string, language: string) {
  await page.clock.setFixedTime(at(date));
  await page.goto(`/p/${date}/`);
  await page.getByRole('radio', { name: meaning }).check();
  await page.getByRole('radio', { name: language }).check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
}

const CIRCUS = { meaning: 'Not my problem; not my business.', language: 'Polish' };

test('home opens today’s puzzle in New York time', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T04:59:00Z')); // 23:59 on the 9th in New York
  await page.goto('/');
  await expect(page).toHaveURL(/\/p\/2026-11-09\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('“Not my circus, not my monkeys.”');

  await page.clock.setFixedTime(new Date('2026-11-10T05:00:00Z')); // midnight
  await page.goto('/');
  await expect(page).toHaveURL(/\/p\/2026-11-10\/$/);
});

test('correct answers: score, reveal, streak, and locked after refresh', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/p/2026-11-09/');
  const submit = page.getByRole('button', { name: 'Submit answers' });
  await expect(submit).toBeDisabled();
  await page.getByRole('radio', { name: CIRCUS.meaning }).check();
  await expect(submit).toBeDisabled();
  await page.getByRole('radio', { name: CIRCUS.language }).check();
  await submit.click();

  await expect(page.getByText('✓ Meaning: correct')).toBeVisible();
  await expect(page.getByText('✓ Language: correct')).toBeVisible();
  await expect(page.locator('[data-score]')).toHaveText('5');
  await expect(page.getByText('Current streak: 1 · Longest: 1')).toBeVisible();

  const reveal = page.locator('[data-reveal]');
  await expect(reveal.getByRole('heading', { name: 'Nie mój cyrk, nie moje małpy' })).toBeVisible();
  await expect(reveal.getByText('Ce ne sont pas mes oignons')).toBeVisible();
  await expect(reveal.getByText('Das ist nicht mein Bier')).toBeVisible();
  await expect(reveal.getByText('Znowu się kłócą?', { exact: false })).toBeVisible();

  await page.reload();
  await expect(submit).toBeHidden();
  await expect(page.getByRole('radio', { name: CIRCUS.meaning })).toBeChecked();
  await expect(page.getByRole('radio', { name: CIRCUS.meaning })).toBeDisabled();
  await expect(page.locator('[data-score]')).toHaveText('5');
  // still one record, so the streak didn't double count
  await expect(page.getByText('Current streak: 1 · Longest: 1')).toBeVisible();
});

test('wrong answers are marked with text, not just colour', async ({ page }) => {
  await play(page, '2026-11-09', "I'm surrounded by fools.", 'Czech');
  await expect(page.locator('[data-score]')).toHaveText('0');
  await expect(page.getByText('✗ Meaning: it means “Not my problem; not my business.”')).toBeVisible();
  await expect(page.getByText('✗ Language: it\'s Polish')).toBeVisible();
  await expect(page.locator('label.wrong').first()).toContainText('✗ Your answer');
  await expect(page.locator('label.correct').first()).toContainText('✓ Answer');
});

test('one right answer scores 2', async ({ page }) => {
  await play(page, '2026-11-09', CIRCUS.meaning, 'Hungarian');
  await expect(page.locator('[data-score]')).toHaveText('2');
});

test('streak grows on consecutive days and resets after a missed day', async ({ page }) => {
  await play(page, '2026-11-07', 'To feel down, gloomy or depressed.', 'French');
  await play(page, '2026-11-08', "I don't understand anything at all.", 'German');
  await expect(page.getByText('Current streak: 2 · Longest: 2')).toBeVisible();
  // skip the 9th and 10th
  await play(page, '2026-11-11', 'To be extremely busy and in need of any help at all.', 'Japanese');
  await expect(page.getByText('Current streak: 1 · Longest: 2')).toBeVisible();
});

test('collection shows only completed expressions', async ({ page }) => {
  await page.goto('/collection/');
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
  await play(page, '2026-11-09', CIRCUS.meaning, CIRCUS.language);
  await page.goto('/collection/');
  await expect(page.getByText('Nothing here yet.')).toBeHidden();
  const cards = page.locator('.card:visible');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Nie mój cyrk, nie moje małpy');
  await expect(cards).toContainText('Polish');
  await cards.getByRole('link').click();
  await expect(page).toHaveURL(/\/p\/2026-11-09\/$/);
  await expect(page.locator('[data-reveal]')).toBeVisible();
});

test('share copies a spoiler-free result', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t: string) => ((window as any).copied = t, Promise.resolve()) },
    });
  });
  await play(page, '2026-11-09', CIRCUS.meaning, CIRCUS.language);
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByText('Copied to clipboard.')).toBeVisible();
  const text: string = await page.evaluate(() => (window as any).copied);
  expect(text).toContain('Lost in Meaning #003');
  expect(text).toContain('🐒 Not my circus, not my monkeys.');
  expect(text).toContain('Meaning: ✓\nLanguage: ✓');
  expect(text).toContain('Score: 5/5');
  expect(text).not.toMatch(/Polish|Nie mój/);
});

test('still playable when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await play(page, '2026-11-09', CIRCUS.meaning, CIRCUS.language);
  await expect(page.getByText('This browser isn\'t saving progress')).toBeVisible();
  await expect(page.locator('[data-score]')).toHaveText('5');
  await expect(page.locator('[data-reveal]')).toBeVisible();
});

test('missing illustration falls back to a labelled plate, and no horizontal scroll', async ({ page }) => {
  await play(page, '2026-11-09', CIRCUS.meaning, CIRCUS.language);
  await expect(page.getByRole('img', { name: /circus tent/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('unknown puzzle shows a not-found page', async ({ page }) => {
  const res = await page.goto('/p/1999-01-01/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Puzzle not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: "Play today's puzzle" })).toHaveAttribute('href', '/');
});
