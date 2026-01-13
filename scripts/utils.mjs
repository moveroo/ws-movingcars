/**
 * Shared Utilities for Astro SEO Scripts
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Read file content safely
 * @param {string} filePath
 * @returns {string|null}
 */
export function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.warn(`Error reading file ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Find all Astro page files recursively
 * @returns {string[]} Array of absolute file paths
 */
export function findPageFiles() {
  const pagesDir = join(projectRoot, 'src', 'pages');

  function getFiles(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const dirent of dirents) {
      const res = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        files.push(...getFiles(res));
      } else if (dirent.name.endsWith('.astro') && !dirent.name.startsWith('_')) {
        files.push(res);
      }
    }
    return files;
  }

  try {
    return getFiles(pagesDir);
  } catch (e) {
    console.error(`Error finding page files: ${e.message}`);
    return [];
  }
}

/**
 * Parse Astro file content into a DOM object
 * Handles stripping frontmatter and script/style tags
 * @param {string} content
 * @returns {JSDOM}
 */
export function parseAstroFile(content) {
  // 1. Remove Frontmatter (--- ... ---)
  let html = content.replace(/^---[\s\S]*?---\n/, '');

  // 2. Remove Astro components specific syntax that JSDOM might choke on
  // This is a naive cleanup, but works for content extraction.
  // We want to keep the HTML structure mostly intact.

  // Remove {variables} expressions somewhat safely to avoid breaking HTML
  // (Note: This is still imperfect for complex expressions but better than raw)
  // html = html.replace(/\{[^}]+\}/g, '');

  // 3. Load into JSDOM
  const dom = new JSDOM(html);

  // 4. Remove scripts and styles for pure content analysis
  const doc = dom.window.document;
  doc.querySelectorAll('script, style').forEach((el) => el.remove());

  return dom;
}

/**
 * Extract text content from a JSDOM Document
 * @param {Document} doc
 * @returns {string} cleaned text
 */
export function extractTextContent(doc) {
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Get relative path from project src/pages
 * @param {string} fullPath
 * @returns {string}
 */
export function getRelativePagePath(fullPath) {
  return fullPath.replace(join(projectRoot, 'src', 'pages') + '/', '');
}

/**
 * Get all valid routes from the pages directory
 * @returns {Set<string>} Set of valid routes (e.g., '/', '/about', '/blog')
 */
export function getAllRoutes() {
  const files = findPageFiles();
  const routes = new Set();

  files.forEach((file) => {
    let route = getRelativePagePath(file);

    // Remove extension
    route = route.replace(/\.astro$/, '');

    // Handle index
    if (route.endsWith('index')) {
      route = route.replace(/index$/, '');
    }

    // Ensure leading slash
    if (!route.startsWith('/')) {
      route = '/' + route;
    }

    // Clean up trailing slash if it's not root
    if (route !== '/' && route.endsWith('/')) {
      route = route.slice(0, -1);
    }

    routes.add(route);
  });

  return routes;
}

export { projectRoot };
