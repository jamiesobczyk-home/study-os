import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { progressFile } from './paths.mjs';

/**
 * Leitner boxes. A card climbs one box each time it is recalled cleanly and
 * drops to box 1 when it is missed, so the cards he keeps getting wrong come
 * back tomorrow and the ones he knows get out of the way for a month.
 */
export const BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 35 };
export const MAX_BOX = 5;

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

export const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const empty = () => ({ version: 1, cards: {}, sessions: [] });

export const load = (course) => {
  const file = progressFile(course);
  if (!existsSync(file)) return empty();
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return { ...empty(), ...data };
  } catch (err) {
    // A corrupt progress file must never cost a study session. Keep the bad
    // file for inspection and carry on from a clean slate.
    const backup = `${file}.broken-${Date.now()}`;
    writeFileSync(backup, readFileSync(file));
    console.error(`Could not read progress (${err.message}). Saved it as ${backup} and started fresh.`);
    return empty();
  }
};

export const save = (course, state) => {
  const file = progressFile(course);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
};

export const cardState = (state, id) =>
  state.cards[id] || { box: 0, due: null, reps: 0, lapses: 0, lastSeen: null };

/** A card is due when it has never been seen, or its due date has arrived. */
export const isDue = (state, id, day = today()) => {
  const c = cardState(state, id);
  return c.box === 0 || !c.due || c.due <= day;
};

/**
 * Record one answer. grade is 'got' | 'shaky' | 'missed'.
 * Returns the updated card so callers can show the next interval.
 */
export const grade = (state, id, result, day = today()) => {
  const prev = cardState(state, id);
  let box;
  if (result === 'got') box = Math.min(MAX_BOX, Math.max(1, prev.box + 1));
  else if (result === 'shaky') box = Math.max(1, prev.box);
  else box = 1;

  const next = {
    box,
    due: addDays(day, BOX_DAYS[box]),
    reps: prev.reps + 1,
    lapses: prev.lapses + (result === 'missed' ? 1 : 0),
    lastSeen: day,
  };
  state.cards[id] = next;
  return next;
};

export const recordSession = (state, entry) => {
  state.sessions.push(entry);
  // Keep the log useful rather than unbounded.
  if (state.sessions.length > 500) state.sessions = state.sessions.slice(-500);
};

/** Per-topic rollup used by `progress` and `today`. */
export const topicSummary = (state, cards, day = today()) => {
  const total = cards.length;
  let seen = 0;
  let due = 0;
  let boxSum = 0;
  for (const c of cards) {
    const s = cardState(state, c.id);
    if (s.box > 0) {
      seen += 1;
      boxSum += s.box;
    }
    if (isDue(state, c.id, day)) due += 1;
  }
  return {
    total,
    seen,
    due,
    // Mean box across cards actually attempted, 0 when nothing has been tried.
    strength: seen ? boxSum / seen : 0,
    coverage: total ? seen / total : 0,
  };
};
