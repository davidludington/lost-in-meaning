# Lost in Meaning

A daily idiom puzzle. Static Astro site: expressions are content files in git, progress lives in localStorage.

```sh
npm install
npm run dev        # http://localhost:4321, shows drafts and future dates (preview)
npm test           # unit tests: scoring, streaks, dates/DST, storage
npm run test:e2e   # preview build with drafts + Playwright (desktop & mobile)
npm run build      # production: type-check + build published puzzles only
```

## How the daily puzzle works

- Each expression has a `date`. The day rolls over at midnight in `PUZZLE_TZ` (`src/lib/day.ts`, America/New_York).
- Production builds include only `status: published` expressions dated up to **tomorrow**, so future answers aren't shipped.
  The site therefore needs a daily rebuild: `.github/workflows/daily-rebuild.yml` calls your host's deploy hook.
- `/` redirects to `/p/<today>/` (or the latest earlier puzzle if a rebuild was missed).
- Answers are in the page source. Fine for a casual puzzle; move grading server-side if that ever matters.

## Adding an expression

1. Copy a file in `src/content/expressions/` and edit the frontmatter. The schema (`src/content.config.ts`) fails the build on missing fields, fewer than 2 related expressions, no sources, or two puzzles on one date.
2. New languages/themes go in `src/data/languages.json` / `themes.json`.
3. Illustration: put the image next to the file and add `illustration: ./name.jpg` (optional; a labelled emoji plate is the fallback). `illustrationAlt` is always required.
4. `related` doubles as the clue ladder: each wrong guess reveals the next one's `literal` (or `phrase` if it has none, as for English). Order them hardest first and put the giveaway last.
5. The markdown body is the editorial "one feeling, different metaphors" paragraph.
6. Preview it with `npm run dev` at `/p/<date>/`.
7. Verify it (below), then set `status: verified`, and `published` when it's ready to go live.

### Verification checklist (PRD 7.3)

Spelling · language attribution · literal translation · meaning · regional variants · register · authentic usage · example sentence · cultural context · comparison expressions · sources resolve. Don't claim an origin that isn't documented.

## Status

The 5 seed expressions are **unverified drafts** with no illustrations; production currently builds zero puzzles. Launch needs 30+ verified, illustrated, published expressions.

Not built (deliberately): analytics, admin UI (content files + dev preview cover it), accounts. All progress goes through `src/lib/progress.ts`, so swapping localStorage for a server later touches one module.

Before deploy: set `site` in `astro.config.mjs` to the real domain.
