import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chapters = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './chapters' }),
  schema: z.object({
    number: z.number().int().nullable(),
    title: z.string(),
    lesson: z.string(),
    /** One line under the title: what happens tonight. */
    summary: z.string(),
    /** Illustration id for the opening plate (content/illustrations/manifest.yaml). */
    plate: z.string().optional(),
    /** Plan 12: AI-drafted prose and unreviewed medical content carry visible TODO(review) flags. */
    review: z.object({
      prose: z.enum(['ai-draft', 'human-edited']),
      medical: z.enum(['unreviewed', 'clinician-reviewed', 'none']),
    }),
  }),
});

export const collections = { chapters };
