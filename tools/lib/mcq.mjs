/**
 * Authored multiple-choice questions: validation, and normalization into the
 * one shape the quiz renders.
 *
 * The rules come from mistakes made earlier in this project:
 * - correct answers that ran twice as long as the wrong ones would have taught
 *   him to pick the longest option, so length is measured;
 * - a wrong pick has to explain itself, so every option carries a `why`;
 * - progress is keyed on ids, so ids are strict and stable.
 */
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/** Validate a parsed mcq.json. Returns { errors, warns }. */
export const validateMcq = (code, data) => {
  const errors = [];
  const warns = [];
  if (!data || typeof data !== 'object') return { errors: ['mcq.json is not an object'], warns };
  if (data.topic !== code) errors.push(`mcq.json topic is "${data.topic}", expected "${code}"`);

  const qs = Array.isArray(data.questions) ? data.questions : [];
  if (!qs.length) errors.push('mcq.json has no questions');

  const seen = new Set();
  let longestIsCorrect = 0;
  let measured = 0;

  qs.forEach((q, i) => {
    const where = `question ${i + 1}`;
    const expected = `${code}-q${String(i + 1).padStart(2, '0')}`;
    if (q.id !== expected) errors.push(`${where}: id is ${q.id || '(none)'}, expected ${expected} (ids must be sequential)`);
    if (seen.has(q.id)) errors.push(`${where}: duplicate id ${q.id}`);
    seen.add(q.id);
    if (!String(q.stem || '').trim()) errors.push(`${where} (${q.id}): empty stem`);

    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) errors.push(`${where} (${q.id}): has ${opts.length} options, needs exactly 4`);
    const correct = opts.filter((o) => o && o.correct === true);
    if (correct.length !== 1) errors.push(`${where} (${q.id}): has ${correct.length} correct options, needs exactly 1`);
    opts.forEach((o, j) => {
      if (!String(o && o.text || '').trim()) errors.push(`${where} (${q.id}): option ${j + 1} has no text`);
      if (!String(o && o.why || '').trim()) errors.push(`${where} (${q.id}): option ${j + 1} has no "why" — a wrong pick must explain itself`);
      if (/\b(all|none) of the above\b/i.test(o && o.text || '')) {
        warns.push(`${where} (${q.id}): "${o.text}" — all/none of the above is a weak option, and the app shuffles order anyway`);
      }
    });

    // The length tell, per question and across the pack.
    if (opts.length === 4 && correct.length === 1) {
      const right = words(correct[0].text);
      const others = opts.filter((o) => o !== correct[0]).map((o) => words(o.text));
      const mean = others.reduce((a, b) => a + b, 0) / others.length;
      measured += 1;
      if (right > Math.max(...others)) longestIsCorrect += 1;
      if (mean && right > mean * 1.5 && right - mean >= 4) {
        warns.push(`${where} (${q.id}): correct option is ${right} words against a ${mean.toFixed(0)}-word average — length gives it away`);
      }
    }
  });

  if (measured >= 5 && longestIsCorrect / measured > 0.4) {
    warns.push(
      `the correct option is the longest in ${longestIsCorrect} of ${measured} questions ` +
      `(${Math.round(longestIsCorrect / measured * 100)}%; chance is 25%) — he'll learn to pick the longest`
    );
  }
  if (qs.length && qs.length < 8) warns.push(`${qs.length} questions — aim for 10 to 14`);

  return { errors, warns, stats: { measured, longestIsCorrect } };
};

/**
 * Normalize an authored question into the quiz's render shape. Trap-derived
 * questions are normalized in tools/lib/traps.mjs into the same shape.
 */
export const normalizeMcq = (q, topic) => ({
  id: q.id,
  topic,
  kind: 'mcq',
  lead: '',
  quote: '',
  prompt: q.stem,
  options: q.options.map((o) => ({ text: o.text, correct: !!o.correct, why: o.why })),
  after: null,
});
