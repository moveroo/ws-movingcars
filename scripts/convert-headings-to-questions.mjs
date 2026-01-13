/**
 * Convert Headings to Questions - Conservative Script
 *
 * Applies question heading conversions from analysis, but skips awkward ones.
 * Only converts natural-sounding headings.
 *
 * Usage: node scripts/convert-headings-to-questions.mjs [--dry-run]
 */

/* eslint-env node */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

// Helper: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Helper: Write file content
function writeFile(filePath, content) {
  if (DRY_RUN) {
    return;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Helper: Check if conversion should be skipped (awkward)
function shouldSkip(original, suggested) {
  const lowerOriginal = original.toLowerCase();
  const lowerSuggested = suggested.toLowerCase();

  // Skip template variables
  if (original.includes('{') || original.includes('}')) {
    return true;
  }

  // Skip if suggested is too long (over 80 chars)
  if (suggested.length > 80) {
    return true;
  }

  // Skip generic/awkward patterns
  const skipPatterns = [
    /^how does .+ work\?$/i, // Too generic "How does X work?"
    /^what is .+ work\?$/i, // Grammatically incorrect
    /page not found/i,
    /explore more/i, // Too vague
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(suggested)) {
      return true;
    }
  }

  // Skip if original is very short (1-2 words) and suggested adds too much
  const originalWords = original.split(' ').length;
  const suggestedWords = suggested.split(' ').length;
  if (originalWords <= 2 && suggestedWords > originalWords + 4) {
    return true;
  }

  // Skip if suggested doesn't make sense
  if (lowerSuggested.includes('how does') && lowerOriginal.includes('route')) {
    // "Routes from X" → "How does routes from X work?" doesn't make sense
    // But "What routes are available from X?" does - so check if it's the good pattern
    if (!lowerSuggested.includes('what routes are available')) {
      return true;
    }
  }

  return false;
}

// Helper: Convert heading in content
function convertHeadingInContent(content, original, suggested) {
  // Escape special regex characters
  const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Pattern 1: <h2>Original</h2> or <h3>Original</h3>
  const htmlPattern = new RegExp(`(<h[23][^>]*>)\\s*${escapedOriginal}\\s*(</h[23]>)`, 'gi');
  if (htmlPattern.test(content)) {
    return content.replace(htmlPattern, `$1${suggested}$2`);
  }

  // Pattern 2: ## Original or ### Original (markdown)
  const markdownPattern = new RegExp(`^(#{2,3})\\s+${escapedOriginal}$`, 'gim');
  if (markdownPattern.test(content)) {
    return content.replace(markdownPattern, `$1 ${suggested}`);
  }

  return content;
}

// Main conversion function
function convertHeadings() {
  console.log('\n🔄 Converting Headings to Questions (Conservative Mode)\n');
  console.log('======================================================================\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }

  // Load analysis results
  const analysisPath = join(projectRoot, 'analysis-question-headings.json');
  if (!fs.existsSync(analysisPath)) {
    console.error('❌ Analysis file not found. Please run analyze-question-headings.mjs first.');
    process.exit(1);
  }

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  const pages = analysis.detailedPages || [];

  let totalConversions = 0;
  let totalSkipped = 0;
  const results = [];

  for (const page of pages) {
    if (!page.suggestions || page.suggestions.length === 0) {
      continue;
    }

    const filePath = join(projectRoot, 'src', 'pages', page.file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${page.file}`);
      continue;
    }

    let content = readFile(filePath);
    if (!content) {
      continue;
    }

    const pageResults = {
      file: page.file,
      converted: [],
      skipped: [],
    };

    for (const suggestion of page.suggestions) {
      const { original, suggested } = suggestion;

      // Check if should skip
      if (shouldSkip(original, suggested)) {
        pageResults.skipped.push({ original, suggested, reason: 'Awkward conversion' });
        totalSkipped++;
        continue;
      }

      // Check if heading exists in content
      if (!content.includes(original)) {
        // Try with different whitespace
        const normalized = original.trim();
        if (!content.includes(normalized)) {
          pageResults.skipped.push({ original, suggested, reason: 'Heading not found' });
          totalSkipped++;
          continue;
        }
      }

      // Convert heading
      const newContent = convertHeadingInContent(content, original, suggested);
      if (newContent !== content) {
        content = newContent;
        pageResults.converted.push({ original, suggested });
        totalConversions++;
      } else {
        pageResults.skipped.push({ original, suggested, reason: 'Conversion failed' });
        totalSkipped++;
      }
    }

    // Write file if changes were made
    if (pageResults.converted.length > 0) {
      writeFile(filePath, content);
      results.push(pageResults);
      console.log(
        `✅ ${page.file}: ${pageResults.converted.length} converted, ${pageResults.skipped.length} skipped`
      );
    } else if (pageResults.skipped.length > 0) {
      console.log(`⏭️  ${page.file}: All ${pageResults.skipped.length} suggestions skipped`);
    }
  }

  // Summary
  console.log('\n======================================================================');
  console.log('📊 CONVERSION SUMMARY');
  console.log('======================================================================\n');

  console.log(`Total Conversions: ${totalConversions}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Files Modified: ${results.length}\n`);

  if (results.length > 0) {
    console.log('Files with conversions:\n');
    results.forEach((result) => {
      console.log(`📄 ${result.file}:`);
      result.converted.slice(0, 3).forEach((conv) => {
        console.log(`   • "${conv.original}" → "${conv.suggested}"`);
      });
      if (result.converted.length > 3) {
        console.log(`   ... and ${result.converted.length - 3} more`);
      }
      console.log('');
    });
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.\n');
  } else {
    console.log('\n✅ Conversion complete!\n');
  }

  // Save conversion log
  const logPath = join(projectRoot, 'conversion-headings-log.json');
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        convertedAt: new Date().toISOString(),
        dryRun: DRY_RUN,
        summary: {
          totalConversions,
          totalSkipped,
          filesModified: results.length,
        },
        results,
      },
      null,
      2
    )
  );
  console.log(`📁 Conversion log saved: ${logPath}\n`);
}

convertHeadings();
