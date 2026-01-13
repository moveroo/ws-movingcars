/**
 * Question Headings Analysis Script
 *
 * Analyzes all pages to identify headings that could be converted to questions
 * for better AI/LLM discoverability.
 *
 * Usage: node scripts/analyze-question-headings.mjs
 */

/* eslint-env node */

import fs from 'fs';
import { join } from 'path';
import {
  findPageFiles,
  readFile,
  parseAstroFile,
  getRelativePagePath,
  projectRoot,
} from './utils.mjs';

// Helper: Extract headings using JSDOM
function extractHeadings(content) {
  const headings = [];
  const dom = parseAstroFile(content);
  const doc = dom.window.document;

  // Query all H2 and H3 elements
  const elements = doc.querySelectorAll('h2, h3');

  elements.forEach((el) => {
    const text = el.textContent.trim();
    if (text) {
      headings.push({
        level: parseInt(el.tagName.substring(1)),
        text: text,
        type: 'html', // JSDOM normalizes everything to HTML elements
      });
    }
  });

  // Note: Markdown-style headings (##) in Astro frontmatter or raw markdown components
  // might be missed by JSDOM if they aren't rendered to HTML in the static source check.
  // For standard Astro usage (HTML-like syntax), this is much more robust.

  return headings;
}

// Helper: Check if heading is already a question
function isQuestion(text) {
  const questionWords = [
    'what',
    'why',
    'how',
    'when',
    'where',
    'who',
    'which',
    'can',
    'do',
    'does',
    'is',
    'are',
    'will',
    'should',
  ];
  const lowerText = text.toLowerCase().trim();
  return (
    questionWords.some((word) => lowerText.startsWith(word)) ||
    lowerText.endsWith('?')
  );
}

// Helper: Capitalize first letter of each word
function capitalizeWords(text) {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper: Suggest question version of heading
function suggestQuestion(text) {
  const originalText = text.trim();
  const lowerText = originalText.toLowerCase().trim();

  // Already a question
  if (isQuestion(text)) {
    return null;
  }

  // Patterns for conversion
  const conversions = [
    {
      pattern: /^routes?\s+from\s+(.+)$/i,
      suggestion: (m) =>
        `What Routes Are Available from ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^routes?\s+to\s+(.+)$/i,
      suggestion: (m) =>
        `What Routes Are Available to ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^popular\s+(.+)$/i,
      suggestion: (m) => `What Are the Popular ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^(.+)\s+guide$/i,
      suggestion: (m) => `What Is the ${capitalizeWords(m[1])} Guide?`,
    },
    {
      pattern: /^(.+)\s+pricing$/i,
      suggestion: (m) => {
        const noun = m[1].toLowerCase();
        return noun.includes('backload')
          ? 'How Much Does Backloading Cost?'
          : `How Much Does ${capitalizeWords(m[1])} Cost?`;
      },
    },
    { pattern: /^pricing$/i, suggestion: () => 'How Much Does It Cost?' },
    { pattern: /^benefits?$/i, suggestion: () => 'What Are the Benefits?' },
    {
      pattern: /^(.+)\s+benefits?$/i,
      suggestion: (m) => `What Are the Benefits of ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^how\s+(.+)$/i,
      suggestion: (m) =>
        m[1].toLowerCase().includes('work')
          ? `How Does ${m[1]}?`
          : `How Does ${m[1]} Work?`,
    },
    {
      pattern: /^how\s+to\s+(.+)$/i,
      suggestion: (m) => `How Do You ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^why\s+(.+)$/i,
      suggestion: (m) => `Why ${capitalizeWords(m[1])}?`,
    },
    {
      pattern: /^(.+)\s+options?$/i,
      suggestion: (m) => `What Are ${capitalizeWords(m[1])} Options?`,
    },
    {
      pattern: /^(.+)\s+process$/i,
      suggestion: (m) => `How Does the ${capitalizeWords(m[1])} Process Work?`,
    },
    {
      pattern: /^(.+)\s+coverage$/i,
      suggestion: () => 'What Areas Do You Cover?',
    },
    { pattern: /^coverage$/i, suggestion: () => 'What Areas Do You Cover?' },
    {
      pattern: /^(.+)\s+service$/i,
      suggestion: (m) => `What ${capitalizeWords(m[1])} Services Do You Offer?`,
    },
    {
      pattern: /^moving\s+to\s+or\s+from\s+(.+)$/i,
      suggestion: (m) =>
        `What Routes Are Available to or from ${capitalizeWords(m[1])}?`,
    },
  ];

  for (const { pattern, suggestion } of conversions) {
    const match = lowerText.match(pattern);
    if (match) {
      const result = suggestion(match);
      if (result) return result;
    }
  }

  // Fallbacks
  const words = originalText.split(' ');
  if (words.length <= 2 && originalText.length < 25) {
    return `What Is ${capitalizeWords(originalText)}?`;
  }
  return `How Does ${capitalizeWords(originalText)} Work?`;
}

// Helper: Analyze a single page
function analyzePage(filePath) {
  const content = readFile(filePath);
  if (!content) return null;

  const fileName = getRelativePagePath(filePath);
  const headings = extractHeadings(content);

  const analysis = {
    file: fileName,
    totalHeadings: headings.length,
    questionHeadings: 0,
    statementHeadings: 0,
    suggestions: [],
  };

  headings.forEach((heading) => {
    if (isQuestion(heading.text)) {
      analysis.questionHeadings++;
    } else {
      analysis.statementHeadings++;
      const suggestion = suggestQuestion(heading.text);
      if (suggestion) {
        analysis.suggestions.push({
          original: heading.text,
          suggested: suggestion,
          level: heading.level,
        });
      }
    }
  });

  return analysis;
}

// Main execution
async function main() {
  console.log(
    '\n🔍 Analyzing Question Headings Across All Pages (JSDOM-Enhanced)\n'
  );
  console.log(
    '======================================================================\n'
  );

  const pageFiles = findPageFiles();
  console.log(`📋 Found ${pageFiles.length} page files\n`);

  const allAnalyses = [];
  for (let i = 0; i < pageFiles.length; i++) {
    process.stdout.write(`⏳ Processing ${i + 1}/${pageFiles.length}...\r`);
    const analysis = analyzePage(pageFiles[i]);
    if (analysis && analysis.totalHeadings > 0) {
      allAnalyses.push(analysis);
    }
  }
  process.stdout.write(`✅ Processed ${pageFiles.length} pages\n\n`);

  // Aggregate results
  let totalHeadings = 0;
  let totalQuestions = 0;
  let totalStatements = 0;
  const pagesWithSuggestions = [];

  allAnalyses.forEach((analysis) => {
    totalHeadings += analysis.totalHeadings;
    totalQuestions += analysis.questionHeadings;
    totalStatements += analysis.statementHeadings;
    if (analysis.suggestions.length > 0) {
      pagesWithSuggestions.push(analysis);
    }
  });

  // Output results
  console.log(
    '======================================================================'
  );
  console.log('📊 ANALYSIS RESULTS');
  console.log(
    '======================================================================\n'
  );

  console.log(`Total Headings Found: ${totalHeadings}`);
  console.log(
    `  ✅ Question Headings: ${totalQuestions} (${Math.round((totalQuestions / (totalHeadings || 1)) * 100)}%)`
  );
  console.log(
    `  📝 Statement Headings: ${totalStatements} (${Math.round((totalStatements / (totalHeadings || 1)) * 100)}%)\n`
  );

  console.log(
    `Pages with Conversion Suggestions: ${pagesWithSuggestions.length}\n`
  );

  if (pagesWithSuggestions.length > 0) {
    console.log(
      '======================================================================'
    );
    console.log('💡 CONVERSION SUGGESTIONS (Top 5 Pages)');
    console.log(
      '======================================================================\n'
    );

    pagesWithSuggestions.slice(0, 5).forEach((analysis) => {
      console.log(`📄 ${analysis.file}`);
      console.log(
        `   Headings: ${analysis.totalHeadings} total, ${analysis.questionHeadings} Qs`
      );
      console.log(`   Suggestions: ${analysis.suggestions.length}\n`);

      analysis.suggestions.slice(0, 3).forEach((s) => {
        console.log(`   • "${s.original}" -> "${s.suggested}" (H${s.level})`);
      });
      console.log('');
    });
  }

  // Save detailed report
  const outputPath = join(projectRoot, 'analysis-question-headings.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        analyzedAt: new Date().toISOString(),
        summary: {
          totalPages: pageFiles.length,
          totalHeadings,
          totalQuestions,
          totalStatements,
        },
        detailedPages: allAnalyses,
      },
      null,
      2
    )
  );

  console.log(`📁 Detailed report saved: ${outputPath}\n`);
}

main();
