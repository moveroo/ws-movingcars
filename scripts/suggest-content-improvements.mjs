/**
 * Content Improvement Suggestions Generator
 *
 * Analyzes pages and generates specific, actionable suggestions to:
 * - Make pages more unique
 * - Expand thin content
 * - Add page-specific details
 * - Improve content quality
 *
 * Usage: node scripts/suggest-content-improvements.mjs [page-file]
 *        node scripts/suggest-content-improvements.mjs (analyzes all pages)
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load the uniqueness analysis
const analysisPath = join(projectRoot, 'analysis-content-uniqueness.json');
let analysisData = null;

try {
  analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
} catch {
  console.error('❌ Please run analyze-content-uniqueness.mjs first');
  process.exit(1);
}

// Helper: Extract city name from filename
function extractCityName(filename) {
  return filename
    .replace('.astro', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper: Get state from city name (basic mapping)
function getStateFromCity(cityName) {
  const stateMap = {
    sydney: 'NSW',
    melbourne: 'VIC',
    brisbane: 'QLD',
    perth: 'WA',
    adelaide: 'SA',
    canberra: 'ACT',
    darwin: 'NT',
    hobart: 'TAS',
    ballarat: 'VIC',
    bendigo: 'VIC',
    geelong: 'VIC',
    gold: 'QLD',
    newcastle: 'NSW',
    cairns: 'QLD',
    townsville: 'QLD',
    toowoomba: 'QLD',
    mackay: 'QLD',
    rockhampton: 'QLD',
    bunbury: 'WA',
    mandurah: 'WA',
    rockingham: 'WA',
    launceston: 'TAS',
    logan: 'QLD',
    wollongong: 'NSW',
    bundaberg: 'QLD',
  };

  const cityLower = cityName.toLowerCase();
  for (const [key, state] of Object.entries(stateMap)) {
    if (cityLower.includes(key)) {
      return state;
    }
  }
  return null;
}

// Helper: Get similar pages
function getSimilarPages(filename) {
  const similarities = analysisData.highSimilarity || [];
  const similar = [];

  similarities.forEach((pair) => {
    if (pair.page1 === filename) {
      similar.push({ file: pair.page2, similarity: pair.similarity });
    } else if (pair.page2 === filename) {
      similar.push({ file: pair.page1, similarity: pair.similarity });
    }
  });

  return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

// Helper: Generate suggestions for a page
function generateSuggestions(filename) {
  const pageData = analysisData.allPages.find((p) => p.file === filename);
  if (!pageData) {
    return null;
  }

  const suggestions = [];
  const cityName = extractCityName(filename);
  const state = getStateFromCity(cityName);
  const similarPages = getSimilarPages(filename);

  // 1. Thin content suggestions
  if (pageData.wordCount < 300) {
    suggestions.push({
      type: 'expand',
      priority: 'high',
      title: 'Expand Content',
      current: `${pageData.wordCount} words`,
      target: '300-500 words minimum',
      suggestions: [
        `Add a "About ${cityName}" section with local information`,
        `Include specific transit times from ${cityName} to major cities`,
        `Add local landmarks or areas served in ${cityName}`,
        `Include ${cityName}-specific moving tips or considerations`,
        `Add information about ${cityName}'s population, economy, or growth`,
        `Include testimonials or case studies from ${cityName} moves`,
      ],
    });
  }

  // 2. Uniqueness suggestions
  if (similarPages.length > 0) {
    const topSimilar = similarPages[0];
    suggestions.push({
      type: 'uniqueness',
      priority: 'high',
      title: 'Make Content More Unique',
      issue: `Content is ${topSimilar.similarity}% similar to ${topSimilar.file}`,
      suggestions: [
        `Add ${cityName}-specific details (population, growth, economy)`,
        `Include unique local landmarks or areas: ${cityName} CBD, suburbs, industrial areas`,
        `Add ${cityName}-specific transit information (e.g., "From ${cityName} to Sydney: 2-3 days")`,
        `Include local moving considerations (parking, access, regulations)`,
        `Add ${cityName}-specific service areas or coverage zones`,
        `Include unique selling points for moving to/from ${cityName}`,
        `Add local statistics or data about ${cityName}`,
        `Include ${cityName}-specific FAQs or common questions`,
      ],
    });
  }

  // 3. Content quality suggestions
  const commonPhrases = analysisData.commonPhrases || [];
  const pageCommonPhrases = commonPhrases.filter((cp) => cp.pages.includes(filename));

  if (pageCommonPhrases.length > 0) {
    suggestions.push({
      type: 'customize',
      priority: 'medium',
      title: 'Customize Common Phrases',
      issue: `Uses ${pageCommonPhrases.length} common phrases found on many other pages`,
      examples: pageCommonPhrases.slice(0, 5).map((cp) => cp.phrase),
      suggestions: [
        `Replace generic phrases with ${cityName}-specific language`,
        `Customize CTAs to mention ${cityName} specifically`,
        `Add ${cityName}-specific examples in place of generic ones`,
        `Include ${cityName} in headings and subheadings`,
      ],
    });
  }

  // 4. SEO suggestions
  if (pageData.wordCount < 500) {
    suggestions.push({
      type: 'seo',
      priority: 'medium',
      title: 'SEO Optimization',
      suggestions: [
        `Add more ${cityName}-related keywords naturally throughout content`,
        `Include long-tail keywords like "${cityName} interstate removalists"`,
        `Add FAQ section with ${cityName}-specific questions`,
        `Include schema markup for LocalBusiness in ${cityName}`,
      ],
    });
  }

  // 5. Structure suggestions
  suggestions.push({
    type: 'structure',
    priority: 'low',
    title: 'Content Structure',
    suggestions: [
      `Add a "Why Choose Moving Again for ${cityName}?" section`,
      `Include a "Popular Routes from ${cityName}" section`,
      `Add a "${cityName} Service Areas" section with suburbs/regions`,
      `Include a "Moving to/from ${cityName}?" section with tips`,
      `Add a "${cityName} Moving Costs" or pricing section`,
    ],
  });

  return {
    file: filename,
    cityName,
    state,
    wordCount: pageData.wordCount,
    title: pageData.title,
    similarPages: similarPages.length,
    suggestions,
  };
}

// Main execution
async function main() {
  const targetFile = process.argv[2];

  console.log('\n💡 Generating Content Improvement Suggestions\n');
  console.log('======================================================================\n');

  if (targetFile) {
    // Analyze single page
    const suggestions = generateSuggestions(targetFile);
    if (!suggestions) {
      console.error(`❌ Page not found: ${targetFile}`);
      process.exit(1);
    }

    displaySuggestions(suggestions);
  } else {
    // Analyze all pages
    const allPages = analysisData.allPages.map((p) => p.file);
    const allSuggestions = allPages.map((file) => generateSuggestions(file)).filter((s) => s);

    // Sort by priority (thin content + high similarity first)
    allSuggestions.sort((a, b) => {
      const aPriority = a.suggestions.filter((s) => s.priority === 'high').length;
      const bPriority = b.suggestions.filter((s) => s.priority === 'high').length;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.wordCount - b.wordCount; // Thin content first
    });

    console.log(`📋 Analyzing ${allSuggestions.length} pages\n`);

    // Show top 10 pages needing improvement
    console.log('======================================================================');
    console.log('🎯 TOP 10 PAGES NEEDING IMPROVEMENT');
    console.log('======================================================================\n');

    allSuggestions.slice(0, 10).forEach((suggestion, idx) => {
      console.log(`${idx + 1}. ${suggestion.file}`);
      console.log(`   Word Count: ${suggestion.wordCount} words`);
      console.log(`   Similar Pages: ${suggestion.similarPages}`);
      console.log(
        `   Priority Issues: ${suggestion.suggestions.filter((s) => s.priority === 'high').length}\n`
      );
    });

    // Show detailed suggestions for top 5
    console.log('\n======================================================================');
    console.log('📝 DETAILED SUGGESTIONS (Top 5 Pages)');
    console.log('======================================================================\n');

    allSuggestions.slice(0, 5).forEach((suggestion) => {
      displaySuggestions(suggestion);
      console.log('');
    });

    // Save all suggestions
    const outputPath = join(projectRoot, 'content-improvement-suggestions.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalPages: allSuggestions.length,
          suggestions: allSuggestions,
        },
        null,
        2
      )
    );

    console.log(`📁 All suggestions saved: ${outputPath}\n`);
  }
}

function displaySuggestions(suggestion) {
  console.log(`📄 ${suggestion.file}`);
  console.log(`   City: ${suggestion.cityName}${suggestion.state ? ` (${suggestion.state})` : ''}`);
  console.log(`   Word Count: ${suggestion.wordCount} words`);
  console.log(`   Similar Pages: ${suggestion.similarPages}`);
  console.log(`   Title: ${suggestion.title || 'N/A'}\n`);

  suggestion.suggestions.forEach((sug) => {
    const priorityIcon = sug.priority === 'high' ? '🔴' : sug.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${priorityIcon} ${sug.title}`);
    if (sug.current) {
      console.log(`   Current: ${sug.current}`);
    }
    if (sug.target) {
      console.log(`   Target: ${sug.target}`);
    }
    if (sug.issue) {
      console.log(`   Issue: ${sug.issue}`);
    }
    if (sug.examples && sug.examples.length > 0) {
      console.log(`   Examples: ${sug.examples.slice(0, 3).join(', ')}`);
    }
    console.log(`   Suggestions:`);
    sug.suggestions.forEach((item) => {
      console.log(`     • ${item}`);
    });
    console.log('');
  });
}

main();
