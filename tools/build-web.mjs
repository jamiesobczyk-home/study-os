#!/usr/bin/env node
/**
 * Bakes the course packs into one self-contained HTML file.
 *
 * The result has no dependencies, no build step at the far end, and no network
 * calls: it runs from a URL, from a USB stick, or from a double-clicked file on
 * a locked-down school laptop where nothing can be installed.
 *
 *   node tools/build-web.mjs            # writes index.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, topicDir } from './lib/paths.mjs';
import { loadCourse, loadSyllabus, hasPack, loadCards } from './lib/syllabus.mjs';

const WEB = join(ROOT, 'web');
const read = (p) => readFileSync(p, 'utf8');

/** Split exam.md the same way the CLI does, so both surfaces agree. */
const parseExam = (markdown) =>
  markdown
    .split(/\n(?=## )/)
    .filter((b) => b.trim().startsWith('## '))
    .map((block) => {
      const [question, scheme = ''] = block.split(/\n### Mark scheme\s*\n/i);
      return { question: question.trim(), scheme: scheme.trim() };
    });

/** Pull the one-sentence summary out of a pack README, if it has one. */
const oneLiner = (readme) => {
  const m = readme.match(/## The one-sentence version\s*\n+([\s\S]*?)(?=\n## |\n?$)/);
  if (!m) return '';
  const text = m[1].trim();
  return /^_.*_$/.test(text) ? '' : text.replace(/\s+/g, ' ');
};

/** Strip a leading "> ..." instruction block aimed at whoever authors packs. */
const stripLeadBlockquote = (md) => md.replace(/^(\s*>.*\n)+\s*\n/, '');

export const build = (courseId) => {
  const course = loadCourse(courseId);
  const syllabus = loadSyllabus(courseId);
  const book = (course.resources || []).find((r) => r.kind === 'study-guide') || null;

  const topics = syllabus.topics.map((t) => {
    const row = {
      code: t.code,
      title: t.title,
      theme: t.theme,
      level: t.level,
      levelTitle: t.levelTitle,
      hlOnly: !!t.hlOnly,
      pages: t.studyGuidePages || null,
      questionsPage: t.studyGuideQuestions || null,
      bookTitle: t.studyGuideTitle || null,
      pack: null,
    };
    if (!hasPack(courseId, t)) return row;

    const dir = topicDir(courseId, t.dir);
    const file = (name) => (existsSync(join(dir, name)) ? read(join(dir, name)) : '');
    const readme = file('README.md');
    row.pack = {
      oneLiner: oneLiner(readme),
      essentials: stripLeadBlockquote(file('essentials.md')).replace(/^#\s+.*\n/, ''),
      videos: stripLeadBlockquote(file('videos.md')).replace(/^#\s+.*\n/, ''),
      traps: file('traps.md').replace(/^#\s+.*\n/, '').replace(/^(\s*>.*\n)+\s*\n/, ''),
      cards: loadCards(courseId, t).map((c) => ({
        id: c.id, q: c.q, a: c.a, note: c.note || '', marks: c.marks || null,
      })),
      exam: parseExam(file('exam.md')),
    };
    return row;
  });

  const methodDoc = join(ROOT, 'docs', 'method.md');
  const data = {
    course: { id: course.id, title: course.title },
    themes: syllabus.themes,
    levels: syllabus.levels,
    book: book
      ? { author: book.author, title: book.title, edition: book.edition, answersUrl: book.answersUrl || '' }
      : null,
    method: existsSync(methodDoc) ? read(methodDoc).replace(/^#\s+.*\n/, '') : '',
    topics,
    builtAt: new Date().toISOString().slice(0, 10),
  };

  // </script> inside embedded JSON would end the script element early.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  const built = read(join(WEB, 'template.html'))
    .replace('__TITLE__', `${course.title} — study-os`)
    .replace('__DESC__', `Retrieval practice and spaced repetition for ${course.title}.`)
    .replace('__COURSE__', course.title)
    .replace('__CSS__', read(join(WEB, 'app.css')))
    .replace('__JS__', read(join(WEB, 'app.js')))
    .replace('__DATA__', json);

  const out = join(ROOT, 'index.html');
  writeFileSync(out, built);

  const packs = topics.filter((t) => t.pack).length;
  const cards = topics.reduce((n, t) => n + (t.pack ? t.pack.cards.length : 0), 0);
  return { out, packs, cards, bytes: Buffer.byteLength(built) };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const courseId = process.argv[2] || 'bio-hl';
  const r = build(courseId);
  console.log(
    `Built ${r.out}\n  ${r.packs} packs, ${r.cards} cards, ${(r.bytes / 1024).toFixed(0)} KB`
  );
}
