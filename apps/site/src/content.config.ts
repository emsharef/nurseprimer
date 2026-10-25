import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chapters = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './chapters' }),
  schema: z.object({
    number: z.number().int().nullable(),
    title: z.string(),
    lesson: z.string(),
    /** One line under the wristband: what the reader will do in this chapter. */
    summary: z.string(),
    /** Plan 12: AI-drafted prose and unreviewed medical content carry visible TODO(review) flags. */
    review: z.object({
      prose: z.enum(['ai-draft', 'human-edited']),
      medical: z.enum(['unreviewed', 'clinician-reviewed', 'none']),
    }),
  }),
});

export const collections = { chapters };
