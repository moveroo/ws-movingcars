/**
 * Image Alt Text Analysis Script
 *
 * Analyzes all pages to find images with missing or generic alt text.
 * Generates suggestions for descriptive alt text.
 *
 * Usage: node scripts/analyze-image-alt-text.mjs
 */

import fs from 'fs';
import { join } from 'path';
import {
  findPageFiles,
  readFile,
  parseAstroFile,
  getRelativePagePath,
  projectRoot,
} from './utils.mjs';

// Helper: Find all component files
function findComponentFiles() {
  const componentsDir = join(projectRoot, 'src', 'components');
  try {
    const files = fs.readdirSync(componentsDir, { recursive: true });
    return files.filter((file) => file.endsWith('.astro')).map((file) => join(componentsDir, file));
  } catch (e) {
    // Components dir might not exist in all projects
    return [];
  }
}

// Helper: Extract images from content using JSDOM
function extractImages(content, filePath) {
  const images = [];
  const fileName = getRelativePagePath(filePath);
  const dom = parseAstroFile(content);
  const doc = dom.window.document;

  // 1. Standard <img> tags
  doc.querySelectorAll('img').forEach((img) => {
    processImageElement(img, 'img', fileName, content, images);
  });

  // 2. Astro <Image /> or <Picture /> components often render as img tags in final HTML,
  // but in source .astro files they exist as component usage.
  // JSDOM parses <Image src={...} /> as valid XML-like elements usually, or explicit tags.
  // Note: Standard JSDOM might lowercase the tag name to <image> or treat unknown tags as HTMLUnknownElement.
  // We check for these specifically.

  // Custom elements might be LowerCased by JSDOM HTML parser
  // We can try to use regex for Component props if JSDOM fails to capture attributes of custom components well,
  // BUT standard JSDOM *does* keep attributes for unknown elements.

  // Let's rely on checking common Astro image component names in lower case which is how JSDOM parses them
  const customTags = ['optimizedimage', 'image', 'picture'];

  customTags.forEach((tagName) => {
    doc.querySelectorAll(tagName).forEach((el) => {
      // Only process if it looks like a component usage (has props)
      processImageElement(el, el.tagName, fileName, content, images);
    });
  });

  return images;
}

function processImageElement(el, tagName, fileName, fullContent, images) {
  let src = el.getAttribute('src');
  let alt = el.getAttribute('alt'); // returns null if missing, "" if empty

  // Handle dynamic props (e.g. src={localImage}) which JSDOM might see as attribute src="{localImage}" or similar
  // If JSDOM stripped braces, we might need to be careful.
  // parseAstroFile cleans some but let's handle "{" characters if they remain.

  // Fallback: If JSDOM didn't pick up attributes because of valid JSX syntax (e.g. src={...}),
  // we might miss them. However, for a *structure* check, we primarily care about the presence of 'alt'.
  // Even if 'alt' is dynamic (alt={title}), it should appear as an attribute.

  const image = {
    file: fileName,
    tag: tagName,
    src: src, // might be a variable reference like "{myImage}"
    alt: alt,
    hasAlt: alt !== null, // Attribute exists (even if empty string)
    altText: alt,
    isGeneric: false,
    suggestion: null,
  };

  if (image.hasAlt) {
    // Check if generic
    const genericAlts = ['image', 'img', 'photo', 'picture', 'logo', 'icon', 'graphic', ''];
    // If alt is dynamic variable (starts with {), assume it's likely okay/contextual, or we can't judge it statically.
    // We only flag explicit generic strings.

    const cleanAlt = (image.alt || '').toLowerCase().trim();
    if (!cleanAlt.startsWith('{')) {
      image.isGeneric = genericAlts.includes(cleanAlt);
    }
  }

  // Generate suggestion if needed
  if (!image.hasAlt || image.isGeneric) {
    image.suggestion = generateAltSuggestion(image.src, image.alt, fullContent);
  }

  images.push(image);
}

// Helper: Generate alt text suggestion
function generateAltSuggestion(src, currentAlt, content) {
  if (!src) return 'Add descriptive alt text';

  // Clean up source if it's a variable
  const cleanSrc = (src || '').replace(/[{}]/g, '');

  // Extract filename from src
  const filename = cleanSrc
    .split('/')
    .pop()
    .replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, '');

  const cleanFilename = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // Context-based suggestions
  if (cleanSrc.includes('logo')) return 'Brand logo';
  if (cleanSrc.includes('icon')) return cleanFilename || 'Icon';

  // Fallback: use filename
  return cleanFilename || 'Descriptive image related to content';
}

// Main execution
async function main() {
  console.log('\n🔍 Analyzing Image Alt Text Across All Pages (JSDOM-Enhanced)\n');
  console.log('======================================================================\n');

  const pageFiles = findPageFiles();
  const componentFiles = findComponentFiles();
  const allFiles = [...pageFiles, ...componentFiles];

  console.log(
    `📋 Found ${allFiles.length} files (${pageFiles.length} pages, ${componentFiles.length} components)\n`
  );

  const allImages = [];
  for (let i = 0; i < allFiles.length; i++) {
    process.stdout.write(`⏳ Processing ${i + 1}/${allFiles.length}...\r`);
    const content = readFile(allFiles[i]);
    if (content) {
      const images = extractImages(content, allFiles[i]);
      allImages.push(...images);
    }
  }
  process.stdout.write(`✅ Processed ${allFiles.length} files\n\n`);

  // Categorize images
  const missingAlt = allImages.filter((img) => !img.hasAlt);
  const genericAlt = allImages.filter((img) => img.hasAlt && img.isGeneric);
  const goodAlt = allImages.filter((img) => img.hasAlt && !img.isGeneric);

  // Output results
  console.log('======================================================================');
  console.log('📊 ALT TEXT ANALYSIS RESULTS');
  console.log('======================================================================\n');

  console.log(`Total Images Found: ${allImages.length}`);
  console.log(
    `  ✅ Good Alt Text: ${goodAlt.length} (${Math.round((goodAlt.length / (allImages.length || 1)) * 100)}%)`
  );
  console.log(
    `  ⚠️  Generic Alt Text: ${genericAlt.length} (${Math.round((genericAlt.length / (allImages.length || 1)) * 100)}%)`
  );
  console.log(
    `  ❌ Missing Alt Text: ${missingAlt.length} (${Math.round((missingAlt.length / (allImages.length || 1)) * 100)}%)\n`
  );

  if (missingAlt.length > 0) {
    console.log('======================================================================');
    console.log('❌ IMAGES WITH MISSING ALT TEXT');
    console.log('======================================================================\n');

    missingAlt.slice(0, 10).forEach((img) => {
      console.log(`📄 ${img.file}`);
      console.log(`   Source: ${img.src || 'N/A'}`);
      console.log(`   Suggestion: "${img.suggestion}"\n`);
    });
  }

  if (genericAlt.length > 0) {
    console.log('======================================================================');
    console.log('⚠️  IMAGES WITH GENERIC ALT TEXT');
    console.log('======================================================================\n');

    genericAlt.slice(0, 10).forEach((img) => {
      console.log(`📄 ${img.file}`);
      console.log(`   Source: ${img.src || 'N/A'}`);
      console.log(`   Current Alt: "${img.altText}"`);
      console.log(`   Suggestion: "${img.suggestion}"\n`);
    });
  }

  // Save detailed report
  const outputPath = join(projectRoot, 'analysis-image-alt-text.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        summary: {
          totalImages: allImages.length,
          goodAlt: goodAlt.length,
          genericAlt: genericAlt.length,
          missingAlt: missingAlt.length,
        },
        missingAlt: missingAlt.map((img) => ({
          file: img.file,
          src: img.src,
          suggestion: img.suggestion,
        })),
        genericAlt: genericAlt.map((img) => ({
          file: img.file,
          src: img.src,
          current: img.altText,
          suggestion: img.suggestion,
        })),
      },
      null,
      2
    )
  );

  console.log(`📁 Detailed report saved: ${outputPath}\n`);
}

main();
