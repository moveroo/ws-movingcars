/**
 * Fix breadcrumb placement - move from template to frontmatter
 */

/* global */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pagesDir = join(projectRoot, 'src', 'pages');

function findAstroFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAstroFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixBreadcrumbPlacement(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check if breadcrumbItems is outside frontmatter (after ---)
  const breadcrumbMatch = content.match(
    /---\n\n\/\/ Breadcrumb data for schema\nconst breadcrumbItems = \[/
  );
  if (!breadcrumbMatch) {
    return { fixed: false, reason: 'No breadcrumb code found or already correct' };
  }

  // Find frontmatter end
  const frontmatterEnd = content.indexOf('---\n', 4);
  if (frontmatterEnd === -1) return { fixed: false, reason: 'No frontmatter found' };

  // Extract breadcrumb code
  const breadcrumbCodeMatch = content.match(
    /\/\/ Breadcrumb data for schema\nconst breadcrumbItems = \[[\s\S]*?\];/
  );
  if (!breadcrumbCodeMatch) return { fixed: false, reason: 'Could not extract breadcrumb code' };

  const breadcrumbCode = breadcrumbCodeMatch[0];
  const breadcrumbStart = breadcrumbCodeMatch.index;
  const breadcrumbEnd = breadcrumbStart + breadcrumbCode.length;

  // Remove breadcrumb code from template
  const beforeBreadcrumb = content.substring(0, breadcrumbStart);
  const afterBreadcrumb = content.substring(breadcrumbEnd);

  // Insert into frontmatter (before closing ---)
  const frontmatterContent = beforeBreadcrumb.substring(0, frontmatterEnd);
  const afterFrontmatter = beforeBreadcrumb.substring(frontmatterEnd) + afterBreadcrumb;

  // Find last non-empty line in frontmatter
  const frontmatterLines = frontmatterContent.split('\n');
  let insertIndex = frontmatterLines.length;
  for (let i = frontmatterLines.length - 1; i >= 0; i--) {
    if (frontmatterLines[i].trim()) {
      insertIndex = i + 1;
      break;
    }
  }

  const newFrontmatter = [
    ...frontmatterLines.slice(0, insertIndex),
    breadcrumbCode,
    ...frontmatterLines.slice(insertIndex),
  ].join('\n');

  const newContent = newFrontmatter + afterFrontmatter;

  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { fixed: true, reason: 'Moved breadcrumb code to frontmatter' };
}

const files = findAstroFiles(pagesDir);
const results = files.map((file) => ({
  file: file.replace(projectRoot + '/', ''),
  ...fixBreadcrumbPlacement(file),
}));

const fixed = results.filter((r) => r.fixed);
console.log(`Fixed ${fixed.length} files`);
fixed.forEach((r) => console.log(`  ✓ ${r.file}`));
