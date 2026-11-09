import { test, expect, type Page } from '@playwright/test';

// Seed drafts: 2026-11-07 cafard, 11-08 Bahnhof, 11-09 Polish circus, 11-10 wolf, 11-11 cat.
// Noon in New York on a given puzzle date:
const at = (date: string) => new Date(`${date}T17:00:00Z`);

/** Guesses meanings in order (the clue ladder), then answers the language bonus. */
async function play(page: Page, date: string, meanings: string | string[], language: string) {
  await page.clock.setFixedTime(at(date));
  await page.goto(`/p/${date}/`);
  for (const m of [meanings].flat()) await page.getByRole('button', { name: m }).click();
  await page.getByRole('button', { name: language }).click();
}

// Returning player by default; the help tests below start fresh
test.beforeEach(async ({ page }, info) => {
  if (!info.title.includes('first visit')) await page.addInitScript(() => localStorage.setItem('lim:help-seen', '1'));
});

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

test('first-clue solve: result, reveal, streak, and locked after refresh', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/p/2026-11-09/');
  const language = page.getByRole('button', { name: CIRCUS.language });
  await expect(language).toBeHidden();
  await expect(page.locator('[data-clue]:visible')).toHaveCount(0);
  await page.getByRole('button', { name: CIRCUS.meaning }).click();
  await language.click();

  await expect(page.getByText('✓ Meaning: got it on clue 1 of 3')).toBeVisible();
  await expect(page.getByText('✓ Language: correct')).toBeVisible();
  await expect(page.locator('[data-score]')).toHaveText('🟩');
  await expect(page.getByText('Current streak: 1 · Longest: 1')).toBeVisible();

  const reveal = page.locator('[data-reveal]');
  await expect(reveal.getByRole('heading', { name: 'Nie mój cyrk, nie moje małpy' })).toBeVisible();
  await expect(reveal.getByText('Ce ne sont pas mes oignons')).toBeVisible();
  await expect(reveal.getByText('Das ist nicht mein Bier')).toBeVisible();
  await expect(reveal.getByText('Znowu się kłócą?', { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: CIRCUS.meaning })).toContainText('✓ Your answer');
  await expect(page.getByRole('button', { name: CIRCUS.meaning })).toBeDisabled();
  await expect(language).toBeDisabled();
  await expect(page.locator('[data-score]')).toHaveText('🟩');
  // still one record, so the streak didn't double count
  await expect(page.getByText('Current streak: 1 · Longest: 1')).toBeVisible();
});

test('each wrong guess reveals the next clue', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/p/2026-11-09/');
  await page.getByRole('button', { name: "I'm surrounded by fools." }).click();
  await expect(page.getByText('Clue 2 · In French')).toBeVisible();
  await expect(page.locator('.clue-text', { hasText: 'Those aren\'t my onions.' })).toBeVisible();
  await expect(page.getByText('Clue 3')).toBeHidden();
  await expect(page.getByRole('button', { name: "I'm surrounded by fools." })).toBeDisabled();
  await expect(page.getByRole('button', { name: CIRCUS.language })).toBeHidden();

  await page.getByRole('button', { name: CIRCUS.meaning }).click();
  await page.getByRole('button', { name: 'Hungarian' }).click();
  await expect(page.locator('[data-score]')).toHaveText('🟥🟩');
  await expect(page.getByText('✓ Meaning: got it on clue 2 of 3')).toBeVisible();
  await expect(page.getByText('Clue 3 · In German')).toBeVisible(); // all clues shown once done
});

test('running out of clues is marked with text, not just colour', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/p/2026-11-09/');
  const wrong = page.locator('[data-meaning-choice]').filter({ hasNotText: CIRCUS.meaning });
  for (let i = 0; i < 3; i++) await wrong.and(page.locator(':enabled')).first().click();
  await page.getByRole('button', { name: 'Czech' }).click();
  await expect(page.locator('[data-score]')).toHaveText('🟥🟥🟥');
  await expect(page.getByText('✗ Meaning: it means “Not my problem; not my business.”')).toBeVisible();
  await expect(page.getByText('✗ Language: it\'s Polish')).toBeVisible();
  await expect(page.locator('.choice.wrong').first()).toContainText('✗ Your answer');
  await expect(page.locator('.choice.correct').first()).toContainText('✓ Answer');
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
  expect(text).toContain('Meaning: 🟩 on clue 1\nLanguage: ✓');
  expect(text).not.toMatch(/Polish|Nie mój/);
});

test('still playable when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/p/2026-11-09/');
  await page.getByRole('button', { name: "Let's play" }).click(); // can't remember it was seen
  await page.getByRole('button', { name: CIRCUS.meaning }).click();
  await page.getByRole('button', { name: CIRCUS.language }).click();
  await expect(page.getByText('This browser isn\'t saving progress')).toBeVisible();
  await expect(page.locator('[data-score]')).toHaveText('🟩');
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

test('how to play opens on first visit only, and from the help button', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/'); // via the redirect page, like a real first visit
  await expect(page).toHaveURL(/\/p\/2026-11-09\/$/);
  const help = page.getByRole('dialog', { name: 'How to play' });
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: "Let's play" }).click();
  await expect(help).toBeHidden();

  await page.reload();
  await expect(help).toBeHidden();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});
