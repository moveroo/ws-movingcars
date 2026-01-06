# Programmatic Site Building Checklist: Lessons from Moving Again

This checklist encapsulates the best practices, architectural decisions, and
lessons learned (including recent SEO fixes) from the _Moving Again_ project.
Use this as a foundation for future programmatic site builds.

---

## 1. Project Initialization & Architecture

- [ ] **Framework**: Initialize with **Astro** (latest) + **Tailwind CSS**.
  - `npm create astro@latest ./ -- --template minimal --typescript strict`
  - `npx astro add tailwind sitemap -y`
- [ ] **Config**: Set up `astro.config.mjs` with:
  - `output: 'static'` (SSG is perfect for thousands of pages)
  - `site: 'https://yourdomain.com'` (for canonical URLs and sitemap)
- [ ] **Image Optimization**: Ensure `sharp` is installed for Astro's image
      service.
  - _Fixes MOB004_: Prevents "no responsive images" warnings.

---

## 2. Development Workflow (Do This First!)

- [ ] **Git**: `git init` immediately.
- [ ] **Linting**: Install Day 1 to avoid formatting issues:
  ```bash
  npm i -D eslint eslint-plugin-astro prettier prettier-plugin-astro typescript-eslint husky lint-staged
  ```
- [ ] **ESLint Config**: Use flat config with TypeScript + Astro support.
- [ ] **Prettier Config**: Include Astro plugin.
- [ ] **Lint-Staged** (Critical Fix):
  - Include `.mjs` files: `*.{js,mjs,jsx,ts,tsx,astro}`
  - Include YAML: `*.{json,css,md,yml,yaml}`
- [ ] **Husky**: Pre-commit hook runs `npx lint-staged`.
- [ ] **CI/CD**: Copy GitHub Actions workflow with:
  - `npm run lint`
  - `npm run format:check`
  - `npm run build`
  - Deployment notification hook

---

## 3. Data Architecture (The "Programmatic" Core)

- [ ] **Content Collections**: Use `src/content/` for your data source.
  - Create a schema in `src/content/config.ts` to strictly type your route data.
- [ ] **Data Structure** (Route Schema):
  ```typescript
  {
    slug: string;
    slugFs: string;       // filesystem-safe slug
    title: string;
    origin: string;
    destination: string;
    originState: string;
    destinationState: string;
    distanceKm?: number;
    transitDays?: string;
    priceRange?: string;
    metaDescription?: string;
    relatedSlugs?: string[];
  }
  ```
- [ ] **Machine-Readable Facts**: Include structured data for LLMs in JSON
      format.

---

## 4. Dynamic Routing Strategy

- [ ] **Slug Pattern**: Use a single catch-all route
      `src/pages/[...slug].astro`.
- [ ] **`getStaticPaths`**:
  - Fetch all entries from content collection.
  - Map to `params: { slug: entry.slug }` and pass data as `props`.
- [ ] **Hub Pages**: Create hub pages for major cities (`/sydney/`,
      `/melbourne/`).
  - Useful as redirect targets for non-indexed routes.

---

## 5. SEO & Schema (Critical for Success)

- [ ] **Canonical URLs**: Force production domain in `SEO.astro` component.
  - Never allow staging/dev URLs to be indexed.
- [ ] **Structured Data**:
  - **Service Schema**: For route pages.
  - **FAQ Schema**: Generate from route data.
  - **LocalBusiness Schema**: For hub pages.
- [ ] **Meta Tags**:
  - Unique Title & Description for _every_ page.
  - Template: "Car Transport from {Origin} to {Destination}".
  - `noindex` for low-quality pages.
- [ ] **Favicons**: Full suite (SVG, PNG, Apple Touch, Manifest).

---

## 6. Content Uniqueness (Avoid Duplicate Content Penalties)

- [ ] **Conditional Content Blocks**: Differentiate pages by:
  - Long-haul vs short-haul advice.
  - State-specific advisories (WA biosecurity, TAS ferry, QLD fire ants).
  - Climate-based tips.
- [ ] **Dynamic Sections**: Each route should feel unique, not templated.
- [ ] **Internal Linking**: Every page links to:
  1. Origin Hub.
  2. Destination Hub.
  3. Related Routes.

---

## 7. Performance & Technical SEO

- [ ] **Scripts**: All third-party scripts use `defer` or `async`.
  - _Fixes PERF001_.
- [ ] **Images**: Use Astro's `<Image />` component with `srcset`.
  - _Fixes MOB004_.
- [ ] **Font Loading**: Self-host with `@fontsource` + `font-display: swap`.

---

## 8. Migration Specifics

- [ ] **Sitemap**: Verify `sitemap-index.xml` includes all routes.
- [ ] **Redirects**: Prepare `_redirects` or `vercel.json` for URL changes.
- [ ] **404 Page**: Custom 404 to catch broken legacy links.

---

## Quick Reference: Package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}
```

---

## File Structure Template

```
/
├── .github/workflows/ci.yml
├── .husky/pre-commit
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   └── routes/*.md
│   ├── layouts/Layout.astro
│   ├── components/
│   │   ├── SEO.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── [...slug].astro
│   └── styles/global.css
├── astro.config.mjs
├── eslint.config.js
├── .prettierrc
├── package.json
└── tsconfig.json
```
