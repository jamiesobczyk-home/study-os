import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { topicDir, progressFile } from './paths.mjs';
import { driftedCards } from './history.mjs';

/**
 * Structural checks for a topic pack. These catch the ways generated content
 * drifts from the format the CLI parses — wrong id shape, a missing mark
 * scheme heading, an invented video URL. They cannot check whether the biology
 * is correct; only the study guide can do that.
 *
 * Returns { errors, warns, info }, each an array of strings.
 */
export const checkPack = (course, topic) => {
  const errors = [];
  const warns = [];
  const info = [];
  const dir = topicDir(course, topic.dir);
  const read = (name) =>
    existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8') : null;

  if (!existsSync(dir)) return { errors: [`no pack directory at ${dir}`], warns, info };

  for (const name of ['README.md', 'essentials.md', 'videos.md', 'cards.json', 'exam.md', 'traps.md']) {
    if (!read(name)) errors.push(`missing ${name}`);
  }

  // ---- cards.json: the file the quiz depends on -------------------------
  const rawCards = read('cards.json');
  let cards = [];
  if (rawCards) {
    try {
      const data = JSON.parse(rawCards);
      cards = data.cards || [];
      if (data.topic && data.topic !== topic.code) {
        errors.push(`cards.json topic is "${data.topic}", expected "${topic.code}"`);
      }
      if (!cards.length) errors.push('cards.json has no cards');

      const seen = new Set();
      cards.forEach((c, i) => {
        const where = `card ${i + 1}`;
        const expected = `${topic.code}-${String(i + 1).padStart(2, '0')}`;
        if (!c.id) errors.push(`${where}: missing id`);
        else {
          if (seen.has(c.id)) errors.push(`${where}: duplicate id ${c.id}`);
          seen.add(c.id);
          if (c.id !== expected) {
            errors.push(`${where}: id is ${c.id}, expected ${expected} (ids must be sequential)`);
          }
        }
        if (!c.q || !String(c.q).trim()) errors.push(`${where}: empty question`);
        if (!c.a || !String(c.a).trim()) errors.push(`${where}: empty answer`);
        // An answer he judges himself against has to be a real answer, not a
        // label. Short ones are almost always a stub.
        else if (String(c.a).trim().length < 40) {
          warns.push(`${where} (${c.id}): answer is very short — it should read like a mark scheme`);
        }
        if (c.q && /^(is|are|does|do|can|will|has|have)\b/i.test(String(c.q).trim())) {
          warns.push(`${where} (${c.id}): question looks answerable with yes/no — rewrite to force recall`);
        }
      });

      // A rebuilt pack reuses ids 01..NN for different questions. Nothing else
      // catches this, and the damage lands on his review history, not on the files.
      const drift = driftedCards(join(dir, 'cards.json'), cards);
      if (drift.length) {
        let studied = new Set();
        try {
          const state = JSON.parse(readFileSync(progressFile(course), 'utf8'));
          studied = new Set(Object.keys(state.cards || {}));
        } catch { /* no progress yet — nothing to corrupt */ }

        for (const d of drift) {
          const line =
            `${d.id}: the question changed under an existing id ` +
            `(was "${d.before.slice(0, 48)}…")`;
          if (studied.has(d.id)) {
            errors.push(`${line} — and he has already studied this card, so his review history now points at different content`);
          } else {
            warns.push(`${line} — safe for now because he has not studied it, but ids must be stable once he starts`);
          }
        }
      }

      if (cards.length < 12) warns.push(`${cards.length} cards — the standard is 12 to 18`);
      if (cards.length > 18) warns.push(`${cards.length} cards — over 18 stops fitting a review session`);
      if (!cards.some((c) => (c.tags || []).includes('hl')) && topic.hlOnly) {
        warns.push('HL-only topic but no cards tagged "hl"');
      }
      if (!cards.some((c) => c.note)) {
        warns.push('no card uses the "note" field — usually the most useful part of a pack');
      }
    } catch (err) {
      errors.push(`cards.json does not parse: ${err.message}`);
    }
  }

  // ---- exam.md: structure is load-bearing for `study exam` --------------
  const exam = read('exam.md');
  if (exam) {
    const blocks = exam.split(/\n(?=## )/).filter((b) => b.trim().startsWith('## '));
    if (!blocks.length) errors.push('exam.md has no "## " question headings — `study exam` cannot parse it');
    blocks.forEach((b, i) => {
      const heading = b.split('\n')[0].trim();
      if (!/\n### Mark scheme\s*\n/i.test(b)) {
        errors.push(`exam question ${i + 1} has no "### Mark scheme" section: ${heading.slice(0, 60)}`);
      }
      if (!/\*\*\[\d+\]\*\*/.test(heading)) {
        warns.push(`exam question ${i + 1} has no mark allocation in its heading`);
      }
    });
    if (blocks.length && blocks.length < 4) warns.push(`${blocks.length} exam questions — aim for 5 or 6`);
  }

  // ---- essentials.md ----------------------------------------------------
  const essentials = read('essentials.md');
  if (essentials) {
    const boxes = (essentials.match(/^- \[ \]/gm) || []).length;
    if (!boxes) errors.push('essentials.md has no "- [ ]" capability checkboxes');
    else if (cards.length && cards.length < boxes * 0.7) {
      // A single card legitimately covers two related capabilities, so an
      // exact match is the wrong bar — warn only on real under-coverage,
      // otherwise this fires on good packs and trains people to ignore it.
      warns.push(`${boxes} capabilities but only ${cards.length} cards — likely capabilities with no card`);
    }
    if (!/^## Core/m.test(essentials)) warns.push('essentials.md has no "## Core" section');
    if (/\{\{[A-Z]+\}\}/.test(essentials)) errors.push('essentials.md still contains template placeholders');
  }

  // ---- videos.md: the place invented URLs show up -----------------------
  const videos = read('videos.md');
  if (videos) {
    const direct = videos.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/g) || [];
    const pinnedSection = videos.split(/^## Pinned/m)[1] || '';
    const unpinned = direct.filter((u) => !pinnedSection.includes(u));
    for (const u of unpinned) {
      warns.push(`direct video URL outside the Pinned section — verify it resolves or replace with a search link: ${u}`);
    }
    if (!/youtube\.com\/results\?search_query=/.test(videos) && !direct.length) {
      warns.push('videos.md has no video links at all');
    }
  }

  // ---- traps.md ---------------------------------------------------------
  const traps = read('traps.md');
  if (traps) {
    const entries = (traps.match(/^## /gm) || []).length;
    if (entries < 3) warns.push(`traps.md has ${entries} entries — aim for 4 to 8`);
  }

  // ---- README and template residue --------------------------------------
  const readme = read('README.md');
  if (readme && !/\*\*Status:\*\*\s*ready/i.test(readme)) {
    warns.push('README.md status is not "ready"');
  }
  if (readme) {
    // The web app pulls the topic subtitle from under this exact heading.
    const m = readme.match(/## The one-sentence version\s*\n+([\s\S]*?)(?=\n## |\n?$)/);
    if (!m) {
      warns.push('README.md has no "## The one-sentence version" heading — the browser app shows no subtitle for this topic');
    } else if (/^_[\s\S]*_$/.test(m[1].trim()) || !m[1].trim()) {
      warns.push('the one-sentence version is still a placeholder — the browser app will show no subtitle');
    }
  }
  for (const name of ['README.md', 'videos.md', 'exam.md', 'traps.md']) {
    const body = read(name);
    if (body && /\{\{[A-Z]+\}\}/.test(body)) errors.push(`${name} still contains template placeholders`);
  }

  if (!topic.studyGuidePages) {
    info.push('studyGuidePages not set — fill it in from the study guide contents page');
  }

  return { errors, warns, info };
};
