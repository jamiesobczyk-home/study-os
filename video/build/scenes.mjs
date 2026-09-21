#!/usr/bin/env node
/**
 * traps.md -> scenes.json
 *
 * Deterministic. Every sentence of biology in the output is copied verbatim
 * from a pack file that has already been checked against the textbook. The
 * only text this file introduces is fixed connective tissue ("People write:",
 * "What scores instead:") — it never paraphrases, summarises or invents.
 *
 * Each scene carries the same content twice:
 *   say  — for text-to-speech: topic codes expanded, markdown stripped
 *   show — for the screen: markdown kept, so emphasis can be rendered
 *
 *   node video/build/scenes.mjs A1.1
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../tools/lib/paths.mjs';
import { loadCourse, loadSyllabus, findTopic, hasPack, readPackFile } from '../../tools/lib/syllabus.mjs';

const BEATS = [
  { label: 'Commonly written', kind: 'mistake', lead: 'People write:' },
  { label: 'Why it does not score', kind: 'why', lead: '' },
  { label: 'Scores instead', kind: 'fix', lead: 'What scores instead:' },
];

/** Split traps.md into its `## ` entries, dropping the H1 and any lead note. */
export const parseTraps = (markdown) =>
  markdown
    .split(/\n(?=## )/)
    .filter((b) => b.trim().startsWith('## '))
    .map((block) => {
      const heading = block.split('\n')[0].replace(/^##\s+/, '').trim();
      const beats = {};
      for (const { label } of BEATS) {
        // Beat bodies wrap across lines and end at the next bold label or heading.
        const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\n\\*\\*|\\n\\s*\\n##|$)`);
        const m = block.match(re);
        if (m) beats[label] = m[1].replace(/\s*\n\s*/g, ' ').trim();
      }
      return { heading, beats };
    })
    .filter((t) => BEATS.every(({ label }) => t.beats[label]));

/**
 * Turn display text into something a speech engine reads naturally:
 * expand topic codes to their titles, and drop markdown emphasis.
 */
export const toSpeech = (text, titles) =>
  text
    .replace(/\b([A-D][1-4]\.\d)\b/g, (m, code) =>
      titles[code] ? `the ${titles[code].toLowerCase()} topic` : m)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

export const buildScenes = (course, code) => {
  const syllabus = loadSyllabus(course);
  const meta = loadCourse(course);
  const topic = findTopic(syllabus, code);
  if (!topic) throw new Error(`${code} is not a topic in ${meta.title}`);
  if (!hasPack(course, topic)) throw new Error(`${code} has no pack yet`);

  const source = readPackFile(course, topic, 'traps.md');
  if (!source) throw new Error(`${code} has no traps.md`);

  const titles = {};
  syllabus.topics.forEach((t) => { titles[t.code] = t.title; });

  const traps = parseTraps(source);
  if (!traps.length) throw new Error(`no parsable trap entries in ${code}/traps.md`);

  const say = (t) => toSpeech(t, titles);
  const scenes = [];

  scenes.push({
    id: 'intro',
    kind: 'title',
    show: `Where the marks go\n${topic.code} ${topic.title}`,
    say: `${traps.length} ways to lose marks on ${topic.title} — and what to write instead.`,
  });

  traps.forEach((trap, i) => {
    const n = i + 1;
    scenes.push({
      id: `t${n}-heading`,
      kind: 'trap-heading',
      trap: n,
      show: trap.heading,
      // Keep the heading whole — stripping its leading verb left a fragment
      // ("Number 5. hydrophobic substances are repelled").
      say: `Number ${n}. ${say(trap.heading).replace(/\.$/, '')}.`,
    });
    for (const { label, kind, lead } of BEATS) {
      const body = trap.beats[label];
      scenes.push({
        id: `t${n}-${kind}`,
        kind,
        trap: n,
        show: body,
        say: lead ? `${lead} ${say(body)}` : say(body),
      });
    }
  });

  scenes.push({
    id: 'outro',
    kind: 'outro',
    show: `${topic.code} ${topic.title}\nstudy-os`,
    say: 'Every one of those is a mark you already knew how to get. Go and write one of them out now, from memory.',
  });

  return {
    course,
    topic: topic.code,
    title: topic.title,
    kind: 'traps',
    videoTitle: `Where the marks go — ${topic.code} ${topic.title}`,
    trapCount: traps.length,
    // Lets `study check` warn when the pack changed after the video was made.
    sourceHash: createHash('sha256').update(source).digest('hex').slice(0, 12),
    builtAt: new Date().toISOString().slice(0, 10),
    scenes,
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = process.argv[2];
  const course = process.argv[3] || 'bio-hl';
  if (!code) {
    console.error('usage: node video/build/scenes.mjs <CODE> [course]');
    process.exit(1);
  }
  const data = buildScenes(course, code);
  const dir = join(ROOT, 'video', 'out', `${data.topic}-traps`);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'scenes.json');
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  const words = data.scenes.reduce((n, s) => n + s.say.split(/\s+/).length, 0);
  console.log(
    `${data.topic}: ${data.trapCount} traps -> ${data.scenes.length} scenes\n` +
    `  ${words} spoken words, roughly ${Math.round(words / 150 * 60)}s of narration\n` +
    `  ${out.replace(ROOT + '/', '')}`
  );
}
