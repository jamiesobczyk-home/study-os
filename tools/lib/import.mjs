/**
 * Turning a model's reply into pack files, with every check done before
 * anything reaches the pack.
 *
 * The manual version of this (save six files by hand) is how a B2.1 reply
 * once overwrote the wrong topic, and how a rebuild could silently repoint
 * card ids. His progress lives in his browser, so no check on the repo can
 * see which ids he's studied; the only safe rule is that a rebuild keeps
 * every id, and this is where that rule is enforced.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { topicDir } from './paths.mjs';
import { PACK_FILE_NAMES, REQUIRED_FILES } from './pack.mjs';
import { validateMcq } from './mcq.mjs';
import { checkPack } from './check.mjs';

const HEADER = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?={3,}[ \t]*`?([^`=\s]+)`?[ \t]*={3,}(?:\*\*)?[ \t]*$/;
const UNCERTAIN = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?UNCERTAIN(?:\*\*)?:?(?:\*\*)?[ \t]*$/;
const FENCE = /^[ \t]*(```|~~~)/;

/** Remove the code fences a chat UI likes to wrap a file in. */
const stripFences = (text) => {
  const lines = text.split('\n');
  const nonBlank = () => {
    let a = 0;
    let b = lines.length - 1;
    while (a <= b && !lines[a].trim()) a += 1;
    while (b >= a && !lines[b].trim()) b -= 1;
    return [a, b];
  };
  const [a, b] = nonBlank();
  const fences = lines.filter((l) => FENCE.test(l)).length;
  if (a < b && FENCE.test(lines[a]) && FENCE.test(lines[b])) {
    lines.splice(b, 1);
    lines.splice(a, 1);
  } else if (fences % 2 === 1) {
    // One unmatched fence: the whole reply was wrapped, and this file got
    // one end of it.
    if (b >= 0 && FENCE.test(lines[b])) lines.splice(b, 1);
    else if (FENCE.test(lines[a])) lines.splice(a, 1);
  }
  return lines.join('\n').trim() + '\n';
};

/** The JSON object in a file, without anything around its outer braces. */
const jsonBody = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) throw new Error('no JSON object found');
  return text.slice(start, end + 1) + '\n';
};

/**
 * Split a reply into files. Returns
 *   { files: [{ name, text }], uncertain: [string], sawUncertain, errors }
 * Text before the first header is chatter and is ignored.
 */
export const parseReply = (raw) => {
  const text = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const errors = [];
  const files = [];
  const uncertain = [];
  let current = null;
  let inUncertain = false;
  let sawUncertain = false;
  let listGap = false;
  let listDone = false;

  for (const line of text.split('\n')) {
    const header = line.match(HEADER);
    if (header) {
      current = { name: header[1].trim(), lines: [] };
      files.push(current);
      inUncertain = false;
      continue;
    }
    if (UNCERTAIN.test(line)) {
      current = null;
      inUncertain = true;
      sawUncertain = true;
      continue;
    }
    if (inUncertain) {
      // A list, then usually some sign-off chat. Bullets start items,
      // indented lines continue them, and anything else after the list ends it.
      if (!line.trim()) {
        if (uncertain.length) listGap = true;
        continue;
      }
      if (FENCE.test(line) || listDone) continue;
      const bullet = line.match(/^[ \t]*(?:[-*•]|\d+[.)])[ \t]+(.*)$/);
      if (bullet) {
        if (!/^none\.?$/i.test(bullet[1].trim())) uncertain.push(bullet[1].trim());
        listGap = false;
      } else if (uncertain.length && !listGap && /^[ \t]/.test(line)) {
        uncertain[uncertain.length - 1] += ` ${line.trim()}`;
      } else if (uncertain.length) {
        listDone = true;
      } else if (!/^none\.?$/i.test(line.trim())) {
        uncertain.push(line.trim());
      }
      continue;
    }
    if (current) current.lines.push(line);
  }

  const seen = new Set();
  const out = [];
  for (const f of files) {
    if (seen.has(f.name)) errors.push(`${f.name} appears twice in the reply`);
    seen.add(f.name);
    out.push({ name: f.name, text: stripFences(f.lines.join('\n')) });
  }
  return { files: out, uncertain, sawUncertain, errors };
};

/**
 * Check a parsed reply against the topic and whatever is already on disk.
 * Nothing is written here. Returns { errors, warns, changed, writes }.
 *
 *   quiz     only mcq.json is accepted
 *   replace  permission to overwrite files that exist
 */
export const vetReply = (course, topic, parsed, { quiz = false, replace = false } = {}) => {
  const errors = [...parsed.errors];
  const warns = [];
  const changed = [];
  const dir = topicDir(course, topic.dir);
  const code = topic.code;
  const byName = new Map(parsed.files.map((f) => [f.name, f.text]));

  if (!parsed.files.length) {
    errors.push('no files found. The reply should have lines like "=== cards.json ===" before each file. Copy the whole reply, not part of it.');
    return { errors, warns, changed, writes: [] };
  }

  // Characters mangled on the way in. Windows PowerShell 5 does this to
  // anything piped into a program, and the traps parser needs the curly
  // apostrophe in "doesn’t".
  const all = parsed.files.map((f) => f.text).join('\n');
  if (all.includes('�') || /doesn\?t score/.test(all)) {
    errors.push(
      'the reply lost its special characters on the way in (curly apostrophes turned into "?"). ' +
      'That happens when Windows PowerShell pipes text. Run the import with no pipe so it reads the ' +
      'clipboard itself, or save the reply to a file and pass the file.'
    );
  }

  for (const name of byName.keys()) {
    if (!PACK_FILE_NAMES.includes(name)) errors.push(`"${name}" isn't a pack file (expected one of ${PACK_FILE_NAMES.join(', ')})`);
  }

  if (quiz) {
    for (const name of byName.keys()) {
      if (name !== 'mcq.json' && PACK_FILE_NAMES.includes(name)) {
        errors.push(`--quiz takes mcq.json only, but the reply also has ${name}`);
      }
    }
    if (!byName.has('mcq.json')) errors.push('--quiz needs an mcq.json in the reply');
    if (!existsSync(join(dir, 'cards.json'))) errors.push(`${code} has no pack yet, so a quiz can't be added to it`);
  } else {
    for (const name of REQUIRED_FILES) {
      if (!byName.has(name)) errors.push(`the reply is missing ${name}`);
    }
    if (!byName.has('mcq.json')) warns.push('the reply has no mcq.json, so the quiz will only have why-did-this-fail questions for this topic');
  }

  // The wrong-topic guard. Every file names its topic somewhere, and when
  // they name another one that's the whole story, so stop there.
  const json = {};
  const claims = [];
  for (const name of ['cards.json', 'mcq.json']) {
    if (!byName.has(name)) continue;
    try {
      const body = jsonBody(byName.get(name));
      json[name] = JSON.parse(body);
      // Keep the file as written, minus any chatter around the braces.
      byName.set(name, body);
      claims.push({ name, says: String(json[name].topic) });
    } catch (err) {
      errors.push(`${name} isn't valid JSON: ${err.message}`);
    }
  }
  for (const [name, text] of byName) {
    if (!name.endsWith('.md')) continue;
    const h1 = (text.match(/^# (.+)$/m) || [])[1] || '';
    claims.push({ name, says: h1.split(/\s+/)[0] || '(no heading)' });
  }
  const wrong = claims.filter((c) => c.says !== code);
  if (wrong.length) {
    const others = [...new Set(wrong.map((c) => c.says))].join(' / ');
    errors.push(
      `this reply looks like it's for ${others}, not ${code}: ${wrong.map((c) => c.name).join(', ')} ` +
      `say${wrong.length === 1 ? 's' : ''} so. Check you copied the right reply, or import it under its own code.`
    );
    return { errors, warns, changed, writes: [] };
  }

  if (json['mcq.json']) {
    const r = validateMcq(code, json['mcq.json']);
    errors.push(...r.errors.map((e) => `mcq.json: ${e}`));
    warns.push(...r.warns.map((w) => `mcq.json: ${w}`));
  }

  // Overwrites need permission, and a replacement has to keep every id.
  const exists = [...byName.keys()].filter((name) => existsSync(join(dir, name)));
  if (exists.length && !replace) {
    errors.push(`${code} already has ${exists.join(', ')}. Add --replace to overwrite ${exists.length === 1 ? 'it' : 'them'}.`);
  }

  const keepIds = (name, listKey, textKey, label) => {
    if (!json[name] || !existsSync(join(dir, name))) return;
    let old;
    try {
      old = JSON.parse(readFileSync(join(dir, name), 'utf8'))[listKey] || [];
    } catch {
      return;
    }
    const fresh = new Map((json[name][listKey] || []).map((item) => [item.id, item]));
    const dropped = old.filter((item) => !fresh.has(item.id)).map((item) => item.id);
    if (dropped.length) {
      errors.push(
        `the reply drops ${dropped.length} existing ${label} id${dropped.length === 1 ? '' : 's'}: ${dropped.join(', ')}. ` +
        `His progress is keyed on them, so a rebuild has to keep every one.`
      );
    }
    for (const item of old) {
      const now = fresh.get(item.id);
      if (now && String(now[textKey]).trim() !== String(item[textKey]).trim()) {
        changed.push({ id: item.id, before: item[textKey], after: now[textKey] });
      }
    }
  };
  keepIds('cards.json', 'cards', 'q', 'card');
  keepIds('mcq.json', 'questions', 'stem', 'quiz');

  const writes = [...byName].map(([name, text]) => ({ name, text }));
  return { errors, warns, changed, writes };
};

/**
 * Write the vetted files, then run the pack check on the result. If the check
 * fails, every file goes back to how it was, so a bad reply never leaves a
 * half-written pack behind. Returns the check result.
 */
export const writePack = (course, topic, writes) => {
  const dir = topicDir(course, topic.dir);
  const createdDir = !existsSync(dir);
  const backup = writes.map(({ name }) => {
    const file = join(dir, name);
    return { file, before: existsSync(file) ? readFileSync(file) : null };
  });

  mkdirSync(dir, { recursive: true });
  for (const { name, text } of writes) writeFileSync(join(dir, name), text);

  const result = checkPack(course, topic);
  if (result.errors.length) {
    for (const { file, before } of backup) {
      if (before === null) rmSync(file, { force: true });
      else writeFileSync(file, before);
    }
    if (createdDir) rmSync(dir, { recursive: true, force: true });
    result.rolledBack = true;
  }
  return result;
};
