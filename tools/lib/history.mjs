import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';
import { ROOT } from './paths.mjs';

/**
 * Read a file as it was at HEAD, or null when it has no committed version.
 *
 * Uses git rather than a lockfile on purpose: there is no extra state to keep
 * in sync, and "what did this file look like before I changed it" is exactly
 * the question a silent pack rebuild needs answering.
 */
export const readCommitted = (absPath) => {
  const rel = relative(ROOT, absPath).split('\\').join('/');
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    // No git, no commit, or the file is new. All mean "no history to compare",
    // which must never be reported as a change.
    return null;
  }
};

/**
 * Items whose text changed under an id that already existed in the committed
 * version. A rebuilt pack reuses ids 01..NN for different content, which
 * silently repoints a student's history at something he never saw.
 */
export const driftedItems = (absPath, current, { listKey, textKey }) => {
  const raw = readCommitted(absPath);
  if (!raw) return [];
  let before;
  try {
    before = JSON.parse(raw)[listKey] || [];
  } catch {
    return [];
  }
  const was = new Map(before.map((c) => [c.id, String(c[textKey] || '').trim()]));
  const drift = [];
  for (const item of current) {
    const old = was.get(item.id);
    const now = String(item[textKey] || '').trim();
    if (old !== undefined && old !== now) drift.push({ id: item.id, before: old, after: now });
  }
  return drift;
};

/** Card ids whose question changed. Kept for existing callers. */
export const driftedCards = (absCardsPath, currentCards) =>
  driftedItems(absCardsPath, currentCards, { listKey: 'cards', textKey: 'q' });
