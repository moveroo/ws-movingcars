/**
 * Fix all breadcrumb placements - move from after --- to before ---
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

  // Check if breadcrumb code is after --- (wrong placement)
  const pattern =
    /---\n\n\/\/ Breadcrumb data for schema\nconst breadcrumbItems = \[[\s\S]*?\];\n\n\n<Layout/;
  if (!pattern.test(content)) {
    return { fixed: false, reason: 'No breadcrumb code found or already correct' };
  }

  // Extract breadcrumb code
  const breadcrumbMatch = content.match(
    /---\n\n\/\/ Breadcrumb data for schema\n(const breadcrumbItems = \[[\s\S]*?\]);/
  );
  if (!breadcrumbMatch) return { fixed: false, reason: 'Could not extract breadcrumb code' };

  const breadcrumbCode = breadcrumbMatch[1];
  const breadcrumbStart = breadcrumbMatch.index;
  const breadcrumbEnd = breadcrumbStart + breadcrumbMatch[0].length;

  // Find the closing --- before breadcrumb code
  const beforeBreadcrumb = content.substring(0, breadcrumbStart);
  const frontmatterEnd = beforeBreadcrumb.lastIndexOf('---\n');
  if (frontmatterEnd === -1) return { fixed: false, reason: 'Could not find frontmatter end' };

  // Remove breadcrumb code from after ---
  const afterBreadcrumb = content.substring(breadcrumbEnd);

  // Insert breadcrumb code before closing ---
  const frontmatterContent = beforeBreadcrumb.substring(0, frontmatterEnd);
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
    '// Breadcrumb data for schema',
    breadcrumbCode,
    ...frontmatterLines.slice(insertIndex),
  ].join('\n');

  const newContent = newFrontmatter + '---\n\n' + afterBreadcrumb;

  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { fixed: true, reason: 'Moved breadcrumb code to frontmatter' };
}

const files = findAstroFiles(pagesDir);
const results = files.map((file) => ({
  file: file.replace(projectRoot + '/', ''),
  ...fixBreadcrumbPlacement(file),
}));

const fixed = results.filter((r) => r.fixed);
console.log(`\n✅ Fixed ${fixed.length} files:\n`);
fixed.forEach((r) => console.log(`  ✓ ${r.file}`));
