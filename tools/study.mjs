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
    'Write it on paper. Then run `quiz` and find out which of those three you actually have.',
    '  '
  ));
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
    console.log(para(dim('\nMark yourself strictly. A point you "basically said" did not score. Where you lost marks, that is the card to go back to.\n')));
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

  ${dim('--course <id>')}      pick a course (default: ${DEFAULT_COURSE})
  ${dim('--limit <n>')}        cards per quiz (default: 20)
  ${dim('--all')}              quiz a whole topic, not just what is due

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
