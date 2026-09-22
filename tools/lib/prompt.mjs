import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, topicDir } from './paths.mjs';

const PROMPT_FILE = join(ROOT, 'prompts', 'topic-pack.md');

/**
 * Build a paste-ready pack prompt for one topic: the portable prompt with
 * every placeholder already filled in from the syllabus, so nothing has to be
 * edited by hand before it goes into another model.
 */
export const buildPrompt = (ctx, topic, { exampleDir = null } = {}) => {
  if (!existsSync(PROMPT_FILE)) {
    throw new Error('prompts/topic-pack.md is missing');
  }
  const raw = readFileSync(PROMPT_FILE, 'utf8');

  // Everything above the first horizontal rule is instructions to the human
  // about how to use the file, not part of what the model should receive.
  const idx = raw.search(/^---$/m);
  let body = (idx === -1 ? raw : raw.slice(idx + 4)).trim();

  const themeLine = `${topic.theme} — ${ctx.syllabus.themes[topic.theme]}`;
  const study = topic.hlOnly ? 'HL only' : 'SL and HL';

  body = body
    .replaceAll('<CODE>', topic.code)
    .replaceAll('<TITLE>', topic.title)
    .replace('- **Theme:** <letter> — <theme name>', `- **Theme:** ${themeLine}`)
    .replace('- **Level:** <Molecules|Cells|Organisms|Ecosystems>', `- **Level:** ${topic.levelTitle}`)
    .replace('- **Level of study:** <SL and HL | HL only>', `- **Level of study:** ${study}`);

  // The book's page range is known, so the generated README can carry it.
  if (topic.studyGuidePages) {
    body = body.replace(
      `**section ${topic.code}**`,
      `**section ${topic.code}, pp. ${topic.studyGuidePages}**`
    );
  }

  // A short, concrete brief at the top beats leaving the model to infer it.
  const facts = [
    `- Topic: **${topic.code} — ${topic.title}**`,
    `- Theme ${themeLine}, level ${topic.levelTitle}`,
    `- ${study}${topic.hlOnly ? ' (this topic appears only in the HL course)' : ''}`,
  ];
  if (topic.studyGuideTitle) {
    facts.push(
      `- His textbook prints this topic as "${topic.studyGuideTitle}"; the syllabus title "${topic.title}" is the correct one.`
    );
  }
  body = `${body}\n\n## This topic\n\n${facts.join('\n')}\n`;

  // The model cannot verify a URL, so hand it the ones a person already has.
  // Without this it either omits channel links or invents them — and an
  // invented handle has already shipped to the student once.
  const channels = (ctx.meta.resources || []).filter((r) => r.url && r.verified);
  if (channels.length) {
    body +=
      `\n## Verified links you may use\n\n` +
      `Copy these **verbatim** if you reference the channel. Do not alter them, ` +
      `and do not invent any other channel or video URL.\n\n` +
      channels
        .map((c) => `- **${c.title}** — <${c.url}>\n  ${c.role || ''}`.trimEnd())
        .join('\n') +
      `\n`;
  }

  // A worked example is worth more than another paragraph of instruction.
  if (exampleDir) {
    const dir = topicDir(ctx.course, exampleDir.dir);
    const parts = [];
    for (const name of ['essentials.md', 'videos.md', 'cards.json', 'exam.md', 'traps.md']) {
      const file = join(dir, name);
      if (existsSync(file)) {
        parts.push(`=== ${name} ===\n\n${readFileSync(file, 'utf8').trim()}`);
      }
    }
    body +=
      `\n---\n\n## A finished pack, for reference\n\n` +
      `Below is the complete pack for ${exampleDir.code} — ${exampleDir.title}, already built to this ` +
      `standard. Match its depth, its tone, and the shape of its files. Do not copy its content: ` +
      `write ${topic.code} from scratch.\n\n` +
      parts.join('\n\n');
  }

  return body;
};
