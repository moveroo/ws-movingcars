import { defineCollection, z } from 'astro:content';

const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    date: z.string(),
  }),
});

export const collections = { testimonials };
