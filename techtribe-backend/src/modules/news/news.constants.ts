export interface NewsCategoryConfig {
  key: string;
  devToTag: string;
  hnQuery: string;
  label: string;
}

export const NEWS_CATEGORIES: Record<string, NewsCategoryConfig> = {
  ai: { key: 'ai', devToTag: 'ai', hnQuery: 'AI OR "machine learning" OR LLM OR OpenAI', label: 'Artificial Intelligence' },
  dev: { key: 'dev', devToTag: 'programming', hnQuery: 'programming OR software engineering', label: 'Programming' },
  sec: { key: 'sec', devToTag: 'security', hnQuery: 'security OR vulnerability OR CVE', label: 'Security' },
  cloud: { key: 'cloud', devToTag: 'cloud', hnQuery: 'cloud OR AWS OR Azure OR GCP', label: 'Cloud' },
  web: { key: 'web', devToTag: 'webdev', hnQuery: '"web development" OR javascript OR frontend', label: 'Web' },
  startups: { key: 'startups', devToTag: 'startup', hnQuery: 'startup OR "Y Combinator" OR funding', label: 'Startups' }
};

export const NEWS_CACHE_TTL_SECONDS = 24 * 60 * 60; // fallback only — actual TTL is computed dynamically, see secondsUntilNextNewsCheckpoint()

/**
 * News refreshes on a fixed daily schedule (UTC): 00:00, 07:00, 12:00, 18:00.
 * Returns the number of seconds from now until the next checkpoint, so the
 * Redis "freshness" flag expires exactly then — every visitor sees the same
 * refresh cadence, not a rolling window that varies by who last requested it.
 */
export function secondsUntilNextNewsCheckpoint(): number {
  const checkpointHours = [0, 7, 12, 18];
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  const nextHour = checkpointHours.find((h) => h > now.getUTCHours());
  if (nextHour !== undefined) {
    next.setUTCHours(nextHour);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(checkpointHours[0]);
  }
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
}
export const VALID_CATEGORIES = Object.keys(NEWS_CATEGORIES);
