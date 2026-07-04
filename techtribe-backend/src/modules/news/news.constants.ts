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

export const NEWS_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h, mirrors frontend cache policy
export const VALID_CATEGORIES = Object.keys(NEWS_CATEGORIES);
