/**
 * Parser for traps.md, shared by the web build and the video pipeline.
 *
 * Every entry is a `## ` heading followed by three bold-labelled parts. The
 * labels are load-bearing: the quiz mode turns them into questions, and the
 * video pipeline turns them into scenes. `study check` enforces their presence.
 */
export const TRAP_LABELS = ['Commonly written', 'Why it doesn’t score', 'Scores instead'];

/** Collapse the hard wrapping used in some packs into single-line prose. */
const unwrap = (s) => s.replace(/\s*\n\s*/g, ' ').trim();

/**
 * Parse traps.md into entries. Entries missing any of the three labels are
 * returned with `complete: false` rather than dropped, so a caller can report
 * the problem instead of silently producing fewer questions.
 */
export const parseTraps = (markdown) => {
  if (!markdown) return [];
  return markdown
    .split(/\n(?=## )/)
    .filter((b) => b.trim().startsWith('## '))
    .map((block, i) => {
      const heading = block.split('\n')[0].replace(/^##\s+/, '').trim();
      const parts = {};
      for (const label of TRAP_LABELS) {
        // A part ends at the next bold label, the next heading, or end of file.
        const re = new RegExp(
          `\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\n\\*\\*|\\n\\s*\\n##|$)`
        );
        const m = block.match(re);
        if (m) parts[label] = unwrap(m[1]);
      }
      const missing = TRAP_LABELS.filter((l) => !parts[l]);
      return {
        index: i + 1,
        heading,
        commonlyWritten: parts['Commonly written'] || '',
        whyItFails: parts['Why it doesn’t score'] || '',
        scoresInstead: parts['Scores instead'] || '',
        complete: missing.length === 0,
        missing,
      };
    });
};

/** Strip the surrounding quote marks the packs wrap student answers in. */
export const unquote = (s) =>
  String(s).trim().replace(/^[“"']\s*/, '').replace(/\s*[”"']$/, '');

/**
 * Turn a topic's traps into quiz questions, in the same render shape as the
 * authored questions in mcq.json.
 *
 * Format: the quote is a wrong answer, and the options are candidate reasons it
 * fails, drawn from the same topic. Every option is a "why it doesn't score"
 * entry, so they share a register and a length. A "which answer scores?" format
 * would leak the answer, because correct answers in these packs run about twice
 * as long as wrong ones.
 *
 * Exactly one option is ever correct: each reason belongs to one trap. A wrong
 * pick is still a real marking point, just for a different mistake, and its
 * explanation says so.
 */
export const trapQuestions = (topicCode, traps, { distractors = 3 } = {}) => {
  const usable = traps.filter((t) => t.complete);
  if (usable.length < 2) return [];
  return usable.map((t, i) => {
    const others = usable.filter((_, j) => j !== i).slice(0, Math.max(1, distractors));
    return {
      id: `${topicCode}-t${t.index}`,
      topic: topicCode,
      kind: 'trap',
      lead: 'A student wrote this. It didn\u2019t score:',
      quote: unquote(t.commonlyWritten),
      prompt: 'Why does it fail?',
      options: [
        { text: t.whyItFails, correct: true, why: 'That\u2019s exactly why it fails.' },
      ].concat(others.map((o) => ({
        text: o.whyItFails,
        correct: false,
        why: `That\u2019s a real marking point, but it\u2019s about a different mistake: ${o.heading.charAt(0).toLowerCase()}${o.heading.slice(1)}.`,
      }))),
      after: { label: 'What would have scored', text: unquote(t.scoresInstead) },
    };
  });
};
