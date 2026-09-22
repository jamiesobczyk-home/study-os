import { readPackFile } from './syllabus.mjs';

/** Every http(s) URL in a pack's videos.md, de-duplicated. */
export const packLinks = (course, topic) => {
  const md = readPackFile(course, topic, 'videos.md') || '';
  const found = md.match(/https?:\/\/[^\s<>)\]]+/g) || [];
  return [...new Set(found.map((u) => u.replace(/[.,]+$/, '')))];
};

/**
 * Check one URL. A YouTube search that resolves but finds nothing is still a
 * dead end for a student, so search URLs are judged on results, not status.
 */
export const checkLink = async (url, { timeoutMs = 20000 } = {}) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (study-os link check)' },
    });
    if (!res.ok) return { url, ok: false, detail: `HTTP ${res.status}` };

    if (url.includes('/results?search_query=')) {
      const body = await res.text();
      const hits = (body.match(/"videoRenderer"/g) || []).length;
      return hits > 0
        ? { url, ok: true, detail: `${hits} results` }
        : { url, ok: false, detail: 'resolves but returns no results' };
    }
    return { url, ok: true, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { url, ok: false, detail: err.name === 'AbortError' ? 'timed out' : err.message };
  } finally {
    clearTimeout(timer);
  }
};
