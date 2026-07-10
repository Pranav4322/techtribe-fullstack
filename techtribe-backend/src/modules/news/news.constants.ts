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
 * News refreshes on a fixed daily schedule, aligned to IST (UTC+5:30):
 * 12:00 AM, 7:00 AM, 12:00 PM, 6:00 PM IST. Since a server has no single
 * "local time", these are hardcoded as their UTC equivalents so every
 * visitor sees the exact same refresh cadence regardless of their own
 * timezone: IST 00:00/07:00/12:00/18:00 → UTC 18:30(prev day)/01:30/06:30/12:30.
 * Returns the number of seconds from now until the next checkpoint, so the
 * Redis "freshness" flag expires exactly then.
 */
export function secondsUntilNextNewsCheckpoint(): number {
  // {hour, minute} in UTC, sorted ascending — the IST-equivalent checkpoints above
  const checkpointsUTC = [
    { hour: 1, minute: 30 },  // IST 07:00
    { hour: 6, minute: 30 },  // IST 12:00
    { hour: 12, minute: 30 }, // IST 18:00
    { hour: 18, minute: 30 }  // IST 00:00 (next IST day)
  ];
  const now = new Date();
  const nowMinutesOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();

  const next = new Date(now);
  next.setUTCSeconds(0, 0);
  const upcoming = checkpointsUTC.find((c) => c.hour * 60 + c.minute > nowMinutesOfDay);
  if (upcoming) {
    next.setUTCHours(upcoming.hour, upcoming.minute, 0, 0);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(checkpointsUTC[0].hour, checkpointsUTC[0].minute, 0, 0);
  }
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
}
export const VALID_CATEGORIES = Object.keys(NEWS_CATEGORIES);
