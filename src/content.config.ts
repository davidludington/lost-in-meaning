import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

const languages = defineCollection({
  loader: file('src/data/languages.json'),
  schema: z.object({
    name: z.string(),
    code: z.string(), // BCP 47, used for lang="" so screen readers pronounce the phrase
    region: z.string().optional(),
    script: z.string().optional(),
  }),
});

const themes = defineCollection({
  loader: file('src/data/themes.json'),
  schema: z.object({ name: z.string(), description: z.string() }),
});

const expressions = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/expressions' }),
  schema: ({ image }) =>
    z.object({
      // YAML turns bare 2026-11-09 into a Date; normalize either form to YYYY-MM-DD
      date: z.coerce.date().transform((d) => d.toISOString().slice(0, 10)),
      status: z.enum(['draft', 'verified', 'published']),
      emoji: z.string(),
      phrase: z.string(),
      language: reference('languages'),
      region: z.string().optional(),
      literal: z.string(),
      meaning: z.string(),
      wrongMeanings: z.array(z.string()).length(3),
      wrongLanguages: z.array(reference('languages')).length(3),
      usage: z.string(),
      example: z.object({ original: z.string(), translation: z.string() }),
      theme: reference('themes'),
      illustration: image().optional(),
      illustrationAlt: z.string(),
      related: z
        .array(z.object({ language: z.string(), phrase: z.string(), literal: z.string().optional(), meaning: z.string() }))
        .min(2),
      sources: z.array(z.url()).min(1),
    }),
});

export const collections = { languages, themes, expressions };
