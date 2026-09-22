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
 * Card ids that now carry a different question than the committed version did.
 * A rebuilt pack reuses ids 01..NN for entirely new questions, which silently
 * repoints a student's review history at content they never saw.
 */
export const driftedCards = (absCardsPath, currentCards) => {
  const raw = readCommitted(absCardsPath);
  if (!raw) return [];
  let before;
  try {
    before = JSON.parse(raw).cards || [];
  } catch {
    return [];
  }
  const was = new Map(before.map((c) => [c.id, String(c.q || '').trim()]));
  const drift = [];
  for (const card of currentCards) {
    const old = was.get(card.id);
    if (old !== undefined && old !== String(card.q || '').trim()) {
      drift.push({ id: card.id, before: old, after: String(card.q || '').trim() });
    }
  }
  return drift;
};
