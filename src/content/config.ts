import { defineCollection, z } from 'astro:content';

const routes = defineCollection({
  type: 'content',
  schema: z.object({
    // URL slugs
    slug: z.string().optional(),
    slugFs: z.string(), // filesystem-safe slug (e.g., sydney-to-melbourne)

    // Display info
    title: z.string(),
    metaDescription: z.string().optional(),

    // Route details
    origin: z.string(),
    destination: z.string(),
    originState: z.string(),
    destinationState: z.string(),

    // Estimated data
    distanceKm: z.number().optional(),
    transitDays: z.string().optional(), // "3-5 business days"
    priceRange: z.string().optional(), // "$800 - $1200"

    // SEO & linking
    canonicalUrl: z.string().optional(),
    relatedSlugs: z.array(z.string()).optional(),

    // Timestamps
    lastUpdated: z.string().optional(),
  }),
});

export const collections = { routes };
