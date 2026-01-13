/**
 * Content Uniqueness & Quality Analyzer
 *
 * Analyzes page content to identify:
 * - Duplicate or similar content across pages
 * - Thin content (too short)
 * - Content quality metrics
 * - Uniqueness scores
 * - Suggestions for improvement
 *
 * Usage: node scripts/analyze-content-uniqueness.mjs
 */

import fs from 'fs';
import { join } from 'path';
import {
  findPageFiles,
  readFile,
  parseAstroFile,
  extractTextContent,
  getRelativePagePath,
  projectRoot,
} from './utils.mjs';

// Helper: Extract visible text (from specific sections) using JSDOM
function extractVisibleContent(dom) {
  const doc = dom.window.document;

  // Clean up non-visible or noise elements
  doc.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove());

  // Focus on content-heavy elements
  const sections = [];
  doc.querySelectorAll('p, h1, h2, h3, li, article, main').forEach((el) => {
    const text = el.textContent.trim();
    if (text.length > 20) {
      // arbitrary threshold for meaningful content
      sections.push(text);
    }
  });

  return sections.join(' ');
}

// Helper: Calculate word count
function getWordCount(text) {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// Helper: Calculate content similarity (simple word overlap)
function calculateSimilarity(text1, text2) {
  // Use sets of 4+ letter words for comparison
  const tokenize = (t) =>
    new Set(
      t
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  // Common stop words to filter out (expanded list)
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'her',
    'was',
    'one',
    'our',
    'out',
    'day',
    'get',
    'has',
    'him',
    'his',
    'how',
    'its',
    'may',
    'new',
    'now',
    'old',
    'see',
    'two',
    'way',
    'who',
    'boy',
    'did',
    'she',
    'use',
    'her',
    'many',
    'than',
    'them',
    'these',
    'so',
    'some',
    'would',
    'make',
    'like',
    'into',
    'time',
    'has',
    'look',
    'more',
    'very',
    'what',
    'know',
    'just',
    'first',
    'also',
    'after',
    'back',
    'other',
    'many',
    'then',
    'them',
    'these',
    'want',
    'been',
    'good',
    'much',
    'some',
    'time',
    'very',
    'when',
    'come',
    'here',
    'just',
    'like',
    'long',
    'make',
    'many',
    'over',
    'such',
    'take',
    'than',
    'them',
    'well',
    'were',
  ]);

  const filtered1 = Array.from(words1).filter((w) => !stopWords.has(w));
  const filtered2 = Array.from(words2).filter((w) => !stopWords.has(w));

  if (filtered1.length === 0 || filtered2.length === 0) return 0;

  const intersection = filtered1.filter((w) => filtered2.includes(w));
  const union = new Set([...filtered1, ...filtered2]);

  return intersection.length / union.size;
}

// Helper: Extract key phrases (n-grams)
function extractKeyPhrases(text, minLength = 3, maxLength = 5) {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const phrases = new Set();

  for (let n = minLength; n <= maxLength && n <= words.length; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      if (phrase.length > 10) {
        phrases.add(phrase);
      }
    }
  }
  return Array.from(phrases);
}

// Helper: Analyze a single page
function analyzePage(filePath) {
  const content = readFile(filePath);
  if (!content) return null;

  const fileName = getRelativePagePath(filePath);
  const dom = parseAstroFile(content);

  const fullText = extractTextContent(dom.window.document);
  const visibleText = extractVisibleContent(dom);
  const wordCount = getWordCount(fullText);
  const visibleWordCount = getWordCount(visibleText);

  // Extract title and description metadata (simple regex still okay for frontmatter/props)
  const titleMatch =
    content.match(/title\s*=\s*["']([^"']+)["']/) || content.match(/title\s*=\s*\{`([^`]+)`\}/);
  const descMatch =
    content.match(/description\s*=\s*["']([^"']+)["']/) ||
    content.match(/description\s*=\s*\{`([^`]+)`\}/);

  return {
    file: fileName,
    wordCount,
    visibleWordCount,
    title: titleMatch ? titleMatch[1] : null,
    description: descMatch ? descMatch[1] : null,
    fullText, // Keep full text for reference if needed, but mainly use visibleText
    visibleText,
    keyPhrases: extractKeyPhrases(visibleText),
  };
}

// Main execution
async function main() {
  console.log('\n🔍 Analyzing Content Uniqueness & Quality (JSDOM-Enhanced)\n');
  console.log('======================================================================\n');

  const pageFiles = findPageFiles();
  console.log(`📋 Found ${pageFiles.length} page files\n`);

  const allPages = [];
  for (let i = 0; i < pageFiles.length; i++) {
    process.stdout.write(`⏳ Processing ${i + 1}/${pageFiles.length}...\r`);
    const analysis = analyzePage(pageFiles[i]);
    if (analysis) {
      allPages.push(analysis);
    }
  }
  process.stdout.write(`✅ Processed ${pageFiles.length} pages\n\n`);

  // Calculate similarities
  console.log('📊 Calculating content similarities...\n');
  const similarities = [];
  const duplicateThreshold = 0.7; // 70%

  // Optimization: Pre-compute word sets to avoid re-tokenizing inside the loop?
  // For now, keeping logic simple as the main bottleneck was DOM parsing.

  for (let i = 0; i < allPages.length; i++) {
    for (let j = i + 1; j < allPages.length; j++) {
      const similarity = calculateSimilarity(allPages[i].visibleText, allPages[j].visibleText);
      if (similarity > 0.3) {
        similarities.push({
          page1: allPages[i].file,
          page2: allPages[j].file,
          similarity: Math.round(similarity * 100),
          wordCount1: allPages[i].wordCount,
          wordCount2: allPages[j].wordCount,
        });
      }
    }
  }

  similarities.sort((a, b) => b.similarity - a.similarity);

  const thinContent = allPages.filter((page) => page.wordCount < 300);
  const goodContent = allPages.filter((page) => page.wordCount >= 300 && page.wordCount < 1000);
  const excellentContent = allPages.filter((page) => page.wordCount >= 1000);

  const highSimilarity = similarities.filter((s) => s.similarity >= duplicateThreshold * 100);
  const mediumSimilarity = similarities.filter(
    (s) => s.similarity >= 50 && s.similarity < duplicateThreshold * 100
  );

  // Output results
  console.log('======================================================================');
  console.log('📊 CONTENT ANALYSIS RESULTS');
  console.log('======================================================================\n');
  console.log(`Total Pages Analyzed: ${allPages.length}\n`);

  console.log('📝 Word Count Distribution:\n');
  console.log(`  ❌ Thin Content (< 300 words): ${thinContent.length} pages`);
  console.log(`  🟡 Good Content (300-999 words): ${goodContent.length} pages`);
  console.log(`  ✅ Excellent Content (1000+ words): ${excellentContent.length} pages\n`);

  console.log('🔍 Content Similarity Analysis:\n');
  console.log(`  🔴 High Similarity (≥70%): ${highSimilarity.length} pairs`);
  console.log(`  🟡 Medium Similarity (50-69%): ${mediumSimilarity.length} pairs`);

  if (thinContent.length > 0) {
    console.log('\n❌ THIN CONTENT PAGES (< 300 words)');
    thinContent
      .sort((a, b) => a.wordCount - b.wordCount)
      .slice(0, 10)
      .forEach((p) => {
        console.log(`  - ${p.file} (${p.wordCount} words)`);
      });
  }

  if (highSimilarity.length > 0) {
    console.log('\n🔴 TOP DUPLICATE CANDIDATES');
    highSimilarity.slice(0, 5).forEach((p) => {
      console.log(`  - ${p.page1} <-> ${p.page2} (${p.similarity}%)`);
    });
  }

  // Save report
  const outputPath = join(projectRoot, 'analysis-content-uniqueness.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        summary: {
          totalPages: allPages.length,
          thinContent: thinContent.length,
          highSimilarityPairs: highSimilarity.length,
          averageWordCount: Math.round(
            allPages.reduce((sum, p) => sum + p.wordCount, 0) / (allPages.length || 1)
          ),
        },
        thinContent: thinContent.map((p) => ({ file: p.file, wordCount: p.wordCount })),
        highSimilarity: highSimilarity,
      },
      null,
      2
    )
  );

  console.log(`\n📁 Detailed report saved: ${outputPath}\n`);
}

main();
