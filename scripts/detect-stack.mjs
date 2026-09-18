#!/usr/bin/env node
const MARKERS = {
  wordpress: [/wp-content\//i, /wp-json/i, /wp-includes\//i, /<meta[^>]+generator[^>]+wordpress/i],
  drupal7: [/Sites\/default\/files/i, /Drupal\.settings/i, /misc\/drupal\.js/i, /<meta[^>]+generator[^>]+drupal 7/i],
  drupal: [/data-drupal-selector/i, /Drupal\.behaviors/i, /core\/misc\/drupal\.js/i, /<meta[^>]+generator[^>]+drupal/i],
  joomla: [/\/components\/com_/i, /<meta[^>]+generator[^>]+joomla/i],
};

function score(html) {
  const results = [];
  for (const [stack, patterns] of Object.entries(MARKERS)) {
    const hits = patterns.filter((re) => re.test(html)).map((re) => re.source);
    if (hits.length > 0) results.push({ stack, hits: hits.length, patterns: hits });
  }
  results.sort((a, b) => b.hits - a.hits);
  return results;
}

function toProfileStack(results) {
  if (results.length === 0) return "generic";
  const best = results[0].stack;
  if (best === "wordpress") return "wordpress";
  if (best === "drupal7") return "drupal7";
  if (best === "drupal") return "generic";
  return "generic";
}

async function detect(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; samaniti-data-col stack detector)" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const html = await response.text();
  const results = score(html);
  return {
    url: response.url,
    detectedStack: results[0]?.stack ?? "unknown",
    profileStack: toProfileStack(results),
    candidates: results,
  };
}

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/detect-stack.mjs <url>");
  process.exit(1);
}

detect(url)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((err) => {
    console.error(`[detect-stack] ${err.message}`);
    process.exit(1);
  });
