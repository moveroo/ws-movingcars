# Moving Cars Migration Roadmap

This roadmap outlines the strategy for migrating content from the existing
movingcars.com.au WordPress site to the new Astro-based site.

---

## Data Summary

- **Indexed Pages**: ~1,358 pages (Google has indexed and values these)
- **Non-Indexed Pages**: ~2,112 pages (Google has crawled but not indexed)

### Indexed Page Types

| Type          | Example                                                 | Approximate Count |
| ------------- | ------------------------------------------------------- | ----------------- |
| Route Pages   | `/adelaide-albany/`                                     | ~1,300            |
| Blog/Advice   | `/advice-to-follow-when-transporting-a-car-interstate/` | ~20               |
| Service Pages | `/enclosed-quote/`, `/caravan-transport-quote-form/`    | ~10               |
| Testimonials  | `/first-class-transport-for-flash-mercedes/`            | ~20               |

### Non-Indexed Page Types

| Type                | Example                                  | Reason for Non-Indexing         |
| ------------------- | ---------------------------------------- | ------------------------------- |
| Low-traffic Routes  | `/adelaide-bowral/`                      | Thin content, low search demand |
| Duplicate/Similar   | `/albury-albury/`                        | Self-referential, no value      |
| Orphan Testimonials | `/100-peace-of-mind-for-precious-cargo/` | Weak internal linking           |
| Edge Routes         | Various remote locations                 | Low search volume               |

---

## Phase 1: Foundation (Current) ✅

- [x] Initialize Astro project
- [x] Set up Tailwind, Sitemap, ESLint, Prettier
- [x] Create dynamic route template (`[...slug].astro`)
- [x] Set up content collection schema
- [x] Add sample routes
- [x] Add data CSVs to project

---

## Phase 2: Indexed Route Pages (Priority)

> **Goal**: Rebuild all ~1,300+ indexed route pages with improved content.

### Strategy

1. **Parse Indexed CSV**
   - Extract all route URLs: `/origin-destination/`
   - Derive `origin`, `destination`, and `slug` from URL pattern

2. **Enrich Route Data**
   - Add distance (km) from external source or calculate
   - Add transit time estimates (based on distance tiers)
   - Add price ranges (if available)

3. **Generate Content Files**
   - Create `.md` files in `src/content/routes/`
   - Each file gets frontmatter with all route data

4. **Template Improvements** (from checklist lessons)
   - **Uniqueness**: Add conditional content blocks to avoid 95%+ similarity
     - Long-haul vs short-haul advice
     - State-specific advisories (WA, TAS, QLD Fire Ants)
     - Climate-based tips
   - **SEO**: Unique titles and meta descriptions
   - **Schema**: Service schema with route-specific data

### Deliverables

- [ ] Script to parse `indexed-pages.csv` → route data JSON
- [ ] Script to generate `.md` files from route data
- [ ] Enhanced route template with unique content zones

---

## Phase 3: Non-Indexed Pages (Redirects)

> **Goal**: Redirect ~2,100 non-indexed pages to appropriate indexed pages.

### Strategy Options

#### Option A: Redirect to Nearest Indexed Route

- For routes like `/adelaide-bowral/` (not indexed), redirect to
  `/adelaide-sydney/` (indexed, similar corridor)
- Requires mapping small towns to nearest capital/hub city

#### Option B: Redirect to Origin Hub Page

- Redirect `/adelaide-bowral/` → `/adelaide/` hub page
- Simpler, but loses destination context

#### Option C: Selective Consolidation

- Keep high-potential non-indexed routes (e.g., emerging cities)
- Redirect the rest

### Implementation

1. Parse non-indexed CSV
2. For each URL, determine redirect target:
   - If origin city has a hub page → redirect to hub
   - If route has a "mirror" (e.g., `/albury-melbourne/` indexed,
     `/melbourne-albury/` not) → redirect to mirror
3. Generate redirect rules:
   - Netlify: `_redirects` file
   - Vercel: `vercel.json`
   - nginx: `return 301` rules

### Deliverables

- [ ] Decision on redirect strategy (A, B, or C)
- [ ] Script to generate redirect mapping
- [ ] `_redirects` or `vercel.json` file with all redirects

---

## Phase 4: Static Pages & Blog

> **Goal**: Migrate non-route pages (blog, service pages, testimonials).

### Indexed Non-Route Pages to Migrate

- `/advice-to-follow-when-transporting-a-car-interstate/`
- `/enclosed-quote/`
- `/caravan-transport-quote-form/`
- `/call-meet-areas/`
- Testimonial pages (keep if valuable, otherwise consolidate)

### Strategy

- Create dedicated `.astro` pages for each
- Ensure proper internal linking from homepage and route pages
- Add unique, high-quality content

---

## Phase 5: Verification & Launch

- [ ] Build site and verify all indexed routes render
- [ ] Test redirect rules locally
- [ ] Run SEO analysis (Domain Monitor) post-migration
- [ ] Set up Google Search Console for new deployment
- [ ] Monitor index coverage after launch

---

## Decisions Needed

> **Before proceeding, clarify the following:**

1. **Redirect Strategy**: Which option (A, B, C) for non-indexed pages?
2. **Hub Pages**: Do we want to create hub pages for major cities (`/sydney/`,
   `/melbourne/`) as redirect targets?
3. **Testimonials**: Keep individual testimonial pages or consolidate into a
   `/testimonials/` page?
4. **Blog Content**: Migrate existing blog posts or start fresh?

---

## File Reference

| File                                           | Purpose                   |
| ---------------------------------------------- | ------------------------- |
| `data/movingcarscomau-indexed-pages-*.csv`     | Pages to rebuild/preserve |
| `data/movingcarscomau-non-indexed-pages-*.csv` | Pages to redirect         |
| `src/content/routes/*.md`                      | Route content files       |
| `src/pages/[...slug].astro`                    | Dynamic route template    |
