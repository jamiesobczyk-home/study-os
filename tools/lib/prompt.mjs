import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, topicDir } from './paths.mjs';
import { loadCards, readPackFile } from './syllabus.mjs';
import { GENERATED_FILES } from './pack.mjs';

const PROMPT_FILE = join(ROOT, 'prompts', 'topic-pack.md');

export const PROMPT_MODES = ['new', 'rebuild', 'quiz'];

/** Which `{{#block}}` sections each mode keeps. */
const BLOCKS = {
  new: ['new', 'pack'],
  rebuild: ['rebuild', 'pack'],
  quiz: ['quiz'],
};

const pad = (n) => String(n).padStart(2, '0');

/** The authored quiz questions for a topic, or [] when it has none. */
const loadMcq = (course, topic) => {
  const raw = readPackFile(course, topic, 'mcq.json');
  if (!raw) return [];
  const data = JSON.parse(raw);
  return Array.isArray(data.questions) ? data.questions : [];
};

/**
 * Fill the template. Blocks for other modes are dropped, then every
 * `{{NAME}}` is replaced in one pass, so text substituted in (a card
 * question, an example file) is never itself treated as template. A name the
 * code doesn't supply is an error rather than a hole in the prompt.
 */
const fill = (template, keep, vars) => {
  let out = template;
  const block = /\{\{#(\w+)\}\}((?:(?!\{\{#)[\s\S])*?)\{\{\/\1\}\}/;
  // Innermost first, so blocks can nest.
  for (let m = out.match(block); m; m = out.match(block)) {
    out = out.replace(m[0], keep.includes(m[1]) ? m[2] : '');
  }
  const unknown = [...out.matchAll(/\{\{([^}]*)\}\}/g)]
    .map((m) => m[1])
    .filter((name) => !(name in vars));
  if (unknown.length) {
    throw new Error(`prompts/topic-pack.md uses placeholders the generator doesn't fill: ${[...new Set(unknown)].join(', ')}`);
  }
  out = out.replace(/\{\{([A-Z_]+)\}\}/g, (_, name) => vars[name]);
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

const verifiedLinks = (ctx) => {
  // The model can't verify a URL, so hand it the ones a person already has.
  // Without this it either omits channel links or invents them, and an
  // invented handle has already shipped to the student once.
  const channels = (ctx.meta.resources || []).filter((r) => r.url && r.verified);
  if (!channels.length) return '## Verified links\n\nNone yet. Use YouTube search URLs only.\n\n';
  return (
    `## Verified links\n\nCopy these exactly if you link to the channel. Don't alter them.\n\n` +
    channels.map((c) => `- **${c.title}**: <${c.url}>${c.role ? `\n  ${c.role}` : ''}`).join('\n') +
    '\n\n'
  );
};

const idList = (cards, mcq) => {
  const parts = ['## Ids already in use\n'];
  if (cards.length) {
    parts.push('Cards. Each id has to keep testing the idea shown here.\n');
    parts.push(cards.map((c) => `- \`${c.id}\` ${c.q}`).join('\n') + '\n');
  }
  if (mcq.length) {
    parts.push('Quiz questions. Same rule.\n');
    parts.push(mcq.map((q) => `- \`${q.id}\` ${q.stem}`).join('\n') + '\n');
  }
  return parts.join('\n') + '\n';
};

const sourceMaterial = (ctx, topic) => {
  const files = ['essentials.md', 'cards.json', 'traps.md']
    .map((name) => [name, readPackFile(ctx.course, topic, name)])
    .filter(([, text]) => text);
  return (
    `## Source material\n\nThe ${topic.code} pack as it stands. Test only what's in here.\n\n` +
    files.map(([name, text]) => `=== ${name} (source, don't return it) ===\n\n${text.trim()}`).join('\n\n') +
    '\n\n'
  );
};

const exampleSection = (ctx, example, mode) => {
  if (!example) return '';
  const dir = topicDir(ctx.course, example.dir);
  const names = mode === 'quiz' ? ['mcq.json'] : GENERATED_FILES;
  const parts = names
    .filter((name) => existsSync(join(dir, name)))
    .map((name) => `=== ${name} ===\n\n${readFileSync(join(dir, name), 'utf8').trim()}`);
  const what = mode === 'quiz' ? `the quiz file for ${example.code} ${example.title}` : `the complete pack for ${example.code} ${example.title}`;
  return (
    `---\n\n## A finished example\n\n` +
    `Below is ${what}, already built to this standard. Match its depth, voice ` +
    `and file shapes. Don't reuse its content: this reply is about ${ctx.topicCode}.\n\n` +
    parts.join('\n\n') + '\n'
  );
};

/**
 * Build a paste-ready prompt for one topic in one of three modes:
 *
 *   new      the seven files for a topic with no pack
 *   rebuild  the seven files again, with every existing id and its question,
 *            because his progress lives in his browser where no check can see it
 *   quiz     mcq.json only, written from the pack's own verified content
 */
export const buildPrompt = (ctx, topic, { mode = 'new', example = null } = {}) => {
  if (!PROMPT_MODES.includes(mode)) throw new Error(`unknown prompt mode "${mode}"`);
  if (!existsSync(PROMPT_FILE)) throw new Error('prompts/topic-pack.md is missing');
  const raw = readFileSync(PROMPT_FILE, 'utf8');

  // Everything above the first rule is instructions for a person.
  const idx = raw.search(/^---$/m);
  const template = idx === -1 ? raw : raw.slice(idx + 4);

  const cards = mode === 'rebuild' ? loadCards(ctx.course, topic) : [];
  const mcq = mode === 'new' ? [] : loadMcq(ctx.course, topic);
  const next = `${topic.code}-q${pad(mcq.length + 1)}`;

  const themeLine = `${topic.theme} — ${ctx.syllabus.themes[topic.theme]}`;
  const study = topic.hlOnly ? 'HL only' : 'SL and HL';
  const pages = topic.studyGuidePages ? `, pp. ${String(topic.studyGuidePages).replace('-', '–')}` : '';

  const facts = [
    `- Topic: **${topic.code} ${topic.title}**`,
    `- Theme ${themeLine}; level: ${topic.levelTitle}`,
    `- ${study}${topic.hlOnly ? ' (this topic is only in the HL course)' : ''}`,
  ];
  if (topic.studyGuideTitle) {
    facts.push(`- His textbook prints this topic as "${topic.studyGuideTitle}". The syllabus title "${topic.title}" is the correct one.`);
  }

  let quizCount = '10 to 14 questions';
  if (mcq.length && mode === 'quiz') quizCount = `The ${mcq.length} existing questions plus 4 to 6 new ones`;
  else if (mcq.length) quizCount = `At least ${Math.max(mcq.length, 10)} questions, keeping all ${mcq.length} existing ids`;

  let existing = '';
  if (mode === 'rebuild') existing = idList(cards, mcq);
  if (mode === 'quiz') existing = sourceMaterial(ctx, topic) + (mcq.length ? idList([], mcq) : '');

  const vars = {
    CODE: topic.code,
    TITLE: topic.title,
    THEME_LINE: themeLine,
    LEVEL: topic.levelTitle,
    STUDY: study,
    GUIDE_SECTION: `section ${topic.code}${pages}`,
    QUIZ_COUNT: quizCount,
    EXISTING_QUIZ_RULE: mcq.length && mode === 'quiz'
      ? `\nIt already has ${mcq.length} quiz questions, listed under **Ids already in use**. ` +
        `Return the whole file: every existing question under its own id (improve the wording ` +
        `if you like, but it has to test the same thing), then the new ones starting at \`${next}\`.`
      : '',
    EXISTING_QUIZ_CHECK: mcq.length ? ', and every id under **Ids already in use** is still there' : '',
    TOPIC_FACTS: facts.join('\n'),
    LINKS: verifiedLinks(ctx),
    EXISTING: existing,
    EXAMPLE: exampleSection({ ...ctx, topicCode: topic.code }, example, mode),
  };

  return fill(template, BLOCKS[mode], vars);
};
