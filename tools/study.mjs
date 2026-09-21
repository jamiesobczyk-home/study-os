#!/usr/bin/env node
/**
 * study - the one command he runs.
 *
 *   node tools/study.mjs today            what to do right now
 *   node tools/study.mjs watch C1.2       the video plan and capture sheet
 *   node tools/study.mjs quiz             retrieval practice on everything due
 *   node tools/study.mjs quiz C1.2        retrieval practice on one topic
 *   node tools/study.mjs exam C1.2        an exam question, then its mark scheme
 *   node tools/study.mjs progress         the whole syllabus at a glance
 *   node tools/study.mjs list             every topic and whether it has a pack
 *   node tools/study.mjs new D1.1         scaffold a new topic pack
 *
 * Zero dependencies. Node 18 or newer.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TEMPLATES, topicDir } from './lib/paths.mjs';
import {
  findTopic, hasPack, listCourses, loadCards, loadCourse, loadSyllabus, readPackFile,
} from './lib/syllabus.mjs';
import * as progress from './lib/progress.mjs';
import { checkPack } from './lib/check.mjs';
import { buildPrompt } from './lib/prompt.mjs';
import { bold, dim, blue, green, yellow, red, rule, para, heading } from './lib/ui.mjs';

const DEFAULT_COURSE = 'bio-hl';

// ---------------------------------------------------------------- arguments

const parseArgs = (argv) => {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
      else flags[key] = true;
    } else positional.push(arg);
  }
  return { flags, positional };
};

const shuffle = (items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const bar = (fraction, width = 12) => {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return '#'.repeat(filled) + dim('.'.repeat(width - filled));
};

// ------------------------------------------------------------------ context

const context = (flags) => {
  const course = flags.course || DEFAULT_COURSE;
  if (!listCourses().includes(course)) {
    console.error(`No course "${course}". Available: ${listCourses().join(', ') || 'none'}`);
    process.exit(1);
  }
  return { course, meta: loadCourse(course), syllabus: loadSyllabus(course) };
};

const requireTopic = (ctx, code) => {
  if (!code) {
    console.error('Which topic? e.g. `node tools/study.mjs watch C1.2`');
    process.exit(1);
  }
  const topic = findTopic(ctx.syllabus, code);
  if (!topic) {
    console.error(`"${code}" is not a topic in ${ctx.meta.title}. Try \`list\`.`);
    process.exit(1);
  }
  return topic;
};

/**
 * The study guide reference for a topic. The book is organised by the same
 * topic codes, so the code alone locates the section; page numbers are
 * optional and filled in from the contents page.
 */
const studyGuideRef = (ctx, topic) => {
  const book = (ctx.meta.resources || []).find((r) => r.kind === 'study-guide');
  if (!book) return null;
  const pages = topic.studyGuidePages ? `pp. ${topic.studyGuidePages}` : 'find it by the topic code';
  // The book prints a different title for a couple of topics; say so rather
  // than let it look like the map is wrong.
  const alias = topic.studyGuideTitle
    ? ` The book prints this one as "${topic.studyGuideTitle}".`
    : '';
  return { book, pages, alias, questions: topic.studyGuideQuestions || null };
};

const packMissing = (ctx, topic) => {
  console.log(heading(`${topic.code} ${topic.title}`));
  console.log(para(
    `This topic is in the syllabus but has no pack yet. Build one with:\n\n` +
    `  node tools/study.mjs new ${topic.code}\n\n` +
    `or ask Claude: "build the ${topic.code} topic pack" — see .claude/skills/topic-pack/SKILL.md.`
  ));
};

// -------------------------------------------------------------- commands

const cmdList = (ctx) => {
  console.log(heading(`${ctx.meta.title} — ${ctx.syllabus.topics.length} topics`));
  let theme = null;
  for (const t of ctx.syllabus.topics) {
    if (t.theme !== theme) {
      theme = t.theme;
      console.log(`\n${bold(`Theme ${theme}`)} ${dim(ctx.syllabus.themes[theme])}`);
    }
    const built = hasPack(ctx.course, t) ? green('pack') : dim('----');
    const hl = t.hlOnly ? yellow(' HL') : '   ';
    console.log(`  ${built}${hl}  ${bold(t.code.padEnd(5))} ${t.title}`);
  }
  console.log(dim('\n  pack = has study material   HL = higher level only\n'));
};

const cmdProgress = (ctx) => {
  const state = progress.load(ctx.course);
  console.log(heading(`${ctx.meta.title} — where you stand`));

  let totalCards = 0; let totalSeen = 0; let totalDue = 0; let packs = 0;
  let theme = null;
  for (const t of ctx.syllabus.topics) {
    if (!hasPack(ctx.course, t)) continue;
    packs += 1;
    if (t.theme !== theme) {
      theme = t.theme;
      console.log(`\n${bold(`Theme ${theme}`)} ${dim(ctx.syllabus.themes[theme])}`);
    }
    const cards = loadCards(ctx.course, t);
    const s = progress.topicSummary(state, cards);
    totalCards += s.total; totalSeen += s.seen; totalDue += s.due;
    const strength = s.seen ? s.strength / progress.MAX_BOX : 0;
    const dueTag = s.due ? yellow(`${s.due} due`) : dim('clear');
    console.log(
      `  ${bold(t.code.padEnd(5))} ${bar(strength)} ` +
      `${String(s.seen).padStart(2)}/${String(s.total).padEnd(2)} seen  ${dueTag}  ${dim(t.title)}`
    );
  }

  if (!packs) {
    console.log(para('\nNo topic packs built yet. Start with `node tools/study.mjs new A1.1`.'));
    return;
  }
  console.log(rule());
  console.log(
    `  ${packs} pack${packs === 1 ? '' : 's'}, ${totalSeen}/${totalCards} cards attempted, ` +
    (totalDue ? yellow(`${totalDue} due now`) : green('nothing due'))
  );
  console.log(dim('  Bars show recall strength, not how much you have read.\n'));
};

const cmdToday = (ctx) => {
  const state = progress.load(ctx.course);
  const day = progress.today();
  const built = ctx.syllabus.topics.filter((t) => hasPack(ctx.course, t));

  const due = [];
  for (const t of built) {
    const cards = loadCards(ctx.course, t);
    const n = cards.filter((c) => progress.isDue(state, c.id, day)).length;
    const fresh = cards.filter((c) => progress.cardState(state, c.id).box === 0).length;
    if (n) due.push({ topic: t, due: n, fresh });
  }

  console.log(heading(`${ctx.meta.title} — ${day}`));

  if (!built.length) {
    console.log(para('No topic packs yet. Build your first one:\n\n  node tools/study.mjs new A1.1'));
    return;
  }

  const totalDue = due.reduce((n, d) => n + d.due, 0);

  if (!totalDue) {
    console.log(para(green('Nothing is due. ') + 'Good place to start a new topic, or run `exam` on something you already know to practise writing it out.'));
  } else {
    console.log(`${bold('Due now:')} ${totalDue} cards across ${due.length} topic${due.length === 1 ? '' : 's'}`);
    for (const d of due.slice(0, 6)) {
      const tag = d.fresh === d.due ? dim('new') : yellow('review');
      console.log(`   ${tag.padEnd(16)} ${bold(d.topic.code.padEnd(5))} ${d.due.toString().padStart(2)} cards  ${dim(d.topic.title)}`);
    }
    if (due.length > 6) console.log(dim(`   ...and ${due.length - 6} more`));
  }

  console.log(heading('A session looks like this'));
  const focus = due[0]?.topic || built[0];
  console.log(para(
    `1. Watch  (15 min)   node tools/study.mjs watch ${focus.code}\n` +
    `2. Capture (5 min)   close the laptop, write what you remember\n` +
    `3. Recall (10 min)   node tools/study.mjs quiz\n` +
    `4. Check  (10 min)   node tools/study.mjs exam ${focus.code}\n`,
    '  '
  ));
  console.log(para(dim('Forty minutes. The capture step is the one that does the work, and it is the one that feels the worst. That is expected — see docs/method.md.\n')));
};

const cmdWatch = (ctx, code) => {
  const topic = requireTopic(ctx, code);
  if (!hasPack(ctx.course, topic)) return packMissing(ctx, topic);

  console.log(heading(`${topic.code} ${topic.title} — watch`));
  const videos = readPackFile(ctx.course, topic, 'videos.md');
  console.log(videos ? videos.trim() : dim('No videos listed yet.'));

  console.log(heading('Capture sheet — fill this in with the video closed'));
  console.log(para(
    'Three things I can now state:\n  1.\n  2.\n  3.\n\n' +
    'One thing I could explain out loud to someone who has not taken the course:\n  -\n\n' +
    'One thing that is still fuzzy:\n  -\n\n' +
    'Write it on paper, from memory, before you open anything.',
    '  '
  ));

  const ref = studyGuideRef(ctx, topic);
  if (ref) {
    console.log(heading('Then check yourself against the book'));
    console.log(para(
      `${ref.book.author} — ${ref.book.title}, ${bold(`section ${topic.code}, ${ref.pages}`)}.${ref.alias}\n\n` +
      'Read it only after the capture sheet is written. It is condensed, so it is a fast way to see what you left out — mark every point you missed. Those are the cards to watch for in the quiz.',
      '  '
    ));
  }
  console.log('');
};

const cmdQuiz = async (ctx, code, flags) => {
  const state = progress.load(ctx.course);
  const day = progress.today();
  const limit = Number(flags.limit) || 20;

  let pool = [];
  if (code) {
    const topic = requireTopic(ctx, code);
    if (!hasPack(ctx.course, topic)) return packMissing(ctx, topic);
    pool = loadCards(ctx.course, topic);
    if (!flags.all) {
      const dueOnly = pool.filter((c) => progress.isDue(state, c.id, day));
      // On a single topic, fall back to the whole deck rather than refusing to
      // run: revising a topic ahead of a test is a legitimate reason to drill.
      if (dueOnly.length) pool = dueOnly;
      else console.log(dim('\nNothing due in this topic — running the whole deck.'));
    }
  } else {
    for (const t of ctx.syllabus.topics) {
      if (!hasPack(ctx.course, t)) continue;
      pool.push(...loadCards(ctx.course, t).filter((c) => progress.isDue(state, c.id, day)));
    }
  }

  if (!pool.length) {
    console.log(para('\nNothing due. Run `today` to see what to start instead.\n'));
    return;
  }

  const deck = shuffle(pool).slice(0, limit);
  const rl = createInterface({ input: stdin, output: stdout });
  const tally = { got: 0, shaky: 0, missed: 0 };

  // Ctrl-D, Ctrl-C or a piped script running out of input closes readline, and
  // a question that is already pending when that happens never settles. Race
  // every prompt against the close event so an interrupted session ends
  // cleanly with its answers saved, instead of hanging.
  let closed = false;
  const onClose = new Promise((resolve) => {
    rl.on('close', () => { closed = true; resolve(null); });
  });
  const ask = (prompt) => {
    if (closed) return Promise.resolve(null);
    return Promise.race([rl.question(prompt).catch(() => null), onClose]);
  };

  console.log(heading(`Recall — ${deck.length} card${deck.length === 1 ? '' : 's'}`));
  console.log(para(dim('Say the answer out loud before you reveal it. Thinking "I know this" is not the same as knowing it, and the whole point of this step is to tell the two apart.\n')));

  try {
    for (let i = 0; i < deck.length; i += 1) {
      const card = deck[i];
      console.log(rule(`${i + 1}/${deck.length}  ${card.topic}`));
      console.log(para(bold(card.q), '  '));
      if (card.marks) console.log(dim(`  [${card.marks} mark${card.marks === 1 ? '' : 's'}]`));
      if (await ask(dim('\n  press enter to reveal ')) === null) break;
      console.log(para(blue(card.a), '  '));
      if (card.note) console.log(para(dim(card.note), '  '));

      let answer = '';
      let aborted = false;
      while (!['g', 's', 'm'].includes(answer)) {
        const reply = await ask(
          `\n  ${green('g')} got it   ${yellow('s')} shaky   ${red('m')} missed it  > `
        );
        if (reply === null) { aborted = true; break; }
        answer = reply.trim().toLowerCase().slice(0, 1);
      }
      if (aborted) break;
      const result = answer === 'g' ? 'got' : answer === 's' ? 'shaky' : 'missed';
      tally[result] += 1;
      const next = progress.grade(state, card.id, result, day);
      // Save every answer so an interrupted session is never wasted.
      progress.save(ctx.course, state);
      console.log(dim(`  -> back in ${progress.BOX_DAYS[next.box]} day${progress.BOX_DAYS[next.box] === 1 ? '' : 's'} (${next.due})\n`));
    }
  } finally {
    rl.close();
  }

  progress.recordSession(state, { date: day, cards: deck.length, ...tally });
  progress.save(ctx.course, state);

  const answered = tally.got + tally.shaky + tally.missed;
  console.log(rule(answered < deck.length ? `stopped after ${answered}` : 'done'));
  console.log(`  ${green(`${tally.got} got`)}   ${yellow(`${tally.shaky} shaky`)}   ${red(`${tally.missed} missed`)}`);
  if (!answered) {
    console.log(para(dim('\n  Nothing recorded. Come back when you have ten minutes.\n')));
  } else if (tally.missed || tally.shaky) {
    console.log(para(dim(`\n  The ${tally.missed + tally.shaky} you did not have are the useful ones — they come back within a day or three. Missing cards is the system working, not you failing.\n`)));
  } else {
    console.log(para(dim('\n  Clean run. Those cards now move out to longer intervals.\n')));
  }
};

/** Split exam.md into question blocks on `## ` headings, each with a mark scheme. */
const parseExam = (markdown) => {
  const blocks = markdown.split(/\n(?=## )/).filter((b) => b.trim().startsWith('## '));
  return blocks.map((block) => {
    const [question, scheme = ''] = block.split(/\n### Mark scheme\s*\n/i);
    return { question: question.trim(), scheme: scheme.trim() };
  });
};

const cmdExam = async (ctx, code) => {
  const topic = requireTopic(ctx, code);
  if (!hasPack(ctx.course, topic)) return packMissing(ctx, topic);

  const raw = readPackFile(ctx.course, topic, 'exam.md');
  if (!raw) {
    console.log(para(`\nNo exam questions in the ${topic.code} pack yet.\n`));
    return;
  }
  const questions = parseExam(raw);
  if (!questions.length) {
    console.log(raw);
    return;
  }

  const picked = shuffle(questions)[0];
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log(heading(`${topic.code} ${topic.title} — exam practice`));
    console.log(para(dim('Write the answer out in full, on paper, before you reveal the mark scheme. Reading a mark scheme and agreeing with it is worth nothing.\n')));
    console.log(picked.question);
    await rl.question(dim('\npress enter for the mark scheme '));
    console.log(heading('Mark scheme'));
    console.log(picked.scheme || dim('(none recorded)'));
    console.log(para(dim('\nMark yourself strictly. A point you "basically said" did not score. Where you lost marks, that is the card to go back to.')));

    const ref = studyGuideRef(ctx, topic);
    if (ref && ref.questions) {
      console.log(para(dim(
        `\nWant more: the study guide's ${topic.theme}${topic.level} question set starts on p. ${ref.questions}, ` +
        `and the answers are free at ${ref.book.answersUrl}\n`
      )));
    } else {
      console.log('');
    }
  } finally {
    rl.close();
  }
};

const cmdNew = (ctx, code) => {
  const topic = requireTopic(ctx, code);
  const dest = topicDir(ctx.course, topic.dir);
  if (existsSync(dest)) {
    console.error(`${topic.code} already has a pack at courses/${ctx.course}/topics/${topic.dir}`);
    process.exit(1);
  }
  const src = join(TEMPLATES, 'topic-pack');
  cpSync(src, dest, { recursive: true });

  for (const file of readdirSync(dest)) {
    const path = join(dest, file);
    const filled = readFileSync(path, 'utf8')
      .replaceAll('{{CODE}}', topic.code)
      .replaceAll('{{TITLE}}', topic.title)
      .replaceAll('{{THEME}}', `${topic.theme} — ${topic.themeTitle}`)
      .replaceAll('{{LEVEL}}', topic.levelTitle)
      .replaceAll('{{HL}}', topic.hlOnly ? 'HL only' : 'SL and HL');
    writeFileSync(path, filled);
  }
  console.log(para(
    `\nScaffolded courses/${ctx.course}/topics/${topic.dir}\n\n` +
    `Fill it in yourself, or hand it to Claude:\n` +
    `  "build out the ${topic.code} topic pack"\n\n` +
    `The house rules for a good pack are in .claude/skills/topic-pack/SKILL.md.\n`
  ));
};

const cmdCheck = (ctx, code) => {
  const topics = code
    ? [requireTopic(ctx, code)]
    : ctx.syllabus.topics.filter((t) => hasPack(ctx.course, t));

  if (!topics.length) {
    console.log(para('\nNo packs to check yet.\n'));
    return;
  }

  console.log(heading(`Checking ${topics.length} pack${topics.length === 1 ? '' : 's'}`));
  let failed = 0;
  let warned = 0;

  for (const topic of topics) {
    const { errors, warns, info } = checkPack(ctx.course, topic);
    if (errors.length) failed += 1;
    if (warns.length) warned += 1;

    const tag = errors.length ? red('FAIL') : warns.length ? yellow('warn') : green(' ok ');
    console.log(`  ${tag}  ${bold(topic.code.padEnd(5))} ${dim(topic.title)}`);
    for (const e of errors) console.log(para(red(`- ${e}`), '        '));
    for (const w of warns) console.log(para(yellow(`- ${w}`), '        '));
    for (const i of info) console.log(para(dim(`- ${i}`), '        '));
  }

  console.log(rule());
  if (failed) {
    console.log(`  ${red(`${failed} pack${failed === 1 ? '' : 's'} with errors`)} — these will not work correctly until fixed.`);
  } else {
    console.log(`  ${green('No structural errors.')}${warned ? ` ${warned} with warnings.` : ''}`);
  }
  console.log(para(dim('\n  This checks structure only. Whether the biology is correct is a question for the study guide.\n')));
  if (failed) process.exitCode = 1;
};

const cmdPrompt = (ctx, code, flags) => {
  const topic = requireTopic(ctx, code);
  if (hasPack(ctx.course, topic) && !flags.force) {
    console.error(`${topic.code} already has a pack. Use --force to print the prompt anyway.`);
    process.exit(1);
  }

  let example = null;
  if (flags.example !== undefined && flags.example !== false) {
    // --example picks a named pack, or the first finished one.
    const built = ctx.syllabus.topics.filter((t) => hasPack(ctx.course, t));
    example = typeof flags.example === 'string'
      ? findTopic(ctx.syllabus, flags.example)
      : built[0];
    if (!example) {
      console.error(`No finished pack to use as an example${typeof flags.example === 'string' ? ` (looked for ${flags.example})` : ''}.`);
      process.exit(1);
    }
    if (!hasPack(ctx.course, example)) {
      console.error(`${example.code} has no pack, so it cannot be the example.`);
      process.exit(1);
    }
  }

  // Everything below goes to stdout and nothing else does, so the whole
  // output can be piped or copied straight into another model.
  console.log(buildPrompt(ctx, topic, { exampleDir: example }));
};

const usage = () => {
  console.log(`
${bold('study')} — a video-first study system

  ${bold('today')}              what to do right now
  ${bold('watch')} <topic>      the video plan and a capture sheet
  ${bold('quiz')} [topic]       retrieval practice on what is due
  ${bold('exam')} <topic>       one exam question, then its mark scheme
  ${bold('progress')}           the whole syllabus at a glance
  ${bold('list')}               every topic, and which have packs
  ${bold('new')} <topic>        scaffold a new topic pack
  ${bold('check')} [topic]      verify pack structure (all packs if omitted)
  ${bold('prompt')} <topic>     print a paste-ready pack prompt for another model

  ${dim('--course <id>')}      pick a course (default: ${DEFAULT_COURSE})
  ${dim('--limit <n>')}        cards per quiz (default: 20)
  ${dim('--all')}              quiz a whole topic, not just what is due
  ${dim('--example [topic]')}   with prompt: include a finished pack as a worked example

${dim('Start here:')}  node tools/study.mjs today
`);
};

// ---------------------------------------------------------------------- main

const main = async () => {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const [command, code] = positional;

  if (!command || command === 'help' || flags.help) return usage();
  const ctx = context(flags);

  switch (command) {
    case 'today': return cmdToday(ctx);
    case 'list': return cmdList(ctx);
    case 'progress': return cmdProgress(ctx);
    case 'watch': return cmdWatch(ctx, code);
    case 'quiz': return cmdQuiz(ctx, code, flags);
    case 'exam': return cmdExam(ctx, code);
    case 'new': return cmdNew(ctx, code);
    case 'check': return cmdCheck(ctx, code);
    case 'prompt': return cmdPrompt(ctx, code, flags);
    default:
      console.error(`Unknown command "${command}".`);
      usage();
      process.exit(1);
  }
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
