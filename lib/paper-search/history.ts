/**
 * 最近检索 —— 仅存浏览器 localStorage 的轻量检索历史（关键词字符串）。
 * 去重、最新在前、最多 8 条。SSR / 隐私模式下静默降级为空。
 */

const STORAGE_KEY = 'paperweave:recent-searches';
const MAX_ITEMS = 8;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(keywords: string): string[] {
  const kw = keywords.trim();
  if (!kw) return getRecentSearches();
  const next = [kw, ...getRecentSearches().filter((s) => s !== kw)].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 存储满 / 隐私模式：忽略
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}
