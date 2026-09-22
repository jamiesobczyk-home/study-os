/**
 * Measures the things that make prose read as machine-written.
 *
 * It does not judge writing. It counts a few objective tells that turned out to
 * be the actual cause when this repo's copy was called out for sounding
 * AI-generated, so they can be watched rather than argued about.
 */

/** Idioms that read as British to an American reader. */
const BRITISH = [
  ['the wrong way round', 'backwards'],
  ['go and write', 'go write'],
  ['go and do', 'go do'],
  ['have got to', 'have to'],
  ['whilst', 'while'],
  ['amongst', 'among'],
  ['learnt', 'learned'],
  ['practise', 'practice'],
  ['maths', 'math'],
];

/** Long forms that a person speaking to a teenager would contract. */
const LONG_FORM =
  /\b(it is|that is|there is|you are|you will|you have|we are|does not|do not|did not|cannot|can not|is not|are not|was not|were not|will not|would not|should not|could not|has not|have not)\b/gi;

const CONTRACTION = /\b[\w]+['’](s|t|re|ll|ve|d|m)\b/g;

export const voiceReport = (label, text) => {
  const body = String(text || '').trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  if (!words) return null;

  const contractions = (body.match(CONTRACTION) || []).length;
  const longForms = (body.match(LONG_FORM) || []).length;
  const emDashes = (body.match(/—/g) || []).length;
  // An -ise regex alone flags precise, concise, exercise, promise, otherwise
  // and wise. Match an explicit list of verbs that genuinely differ instead.
  const ise = (body.match(
    /\b(?:stabilis|organis|recognis|summaris|minimis|maximis|specialis|characteris|utilis|realis|emphasis|polaris|oxidis|neutralis|synthesis|memoris|mobilis|prioritis|analys|catalys|hydrolys)(?:e|es|ed|ing|ation)\b/gi
  ) || []).length;
  const british = BRITISH.filter(([uk]) => new RegExp(`\\b${uk}\\b`, 'i').test(body))
    .map(([uk, us]) => `${uk} → ${us}`);

  const notes = [];
  // A person writing to a teenager contracts constantly. Long forms
  // outnumbering contractions is the loudest tell there is.
  if (words > 120 && contractions === 0) {
    notes.push('no contractions at all');
  } else if (longForms > contractions * 2 && longForms > 3) {
    notes.push(`${longForms} long forms vs ${contractions} contractions`);
  }
  if (emDashes / words * 1000 > 6) {
    notes.push(`${(emDashes / words * 1000).toFixed(1)} em-dashes per 1k words`);
  }
  if (ise) notes.push(`${ise} -ise spelling${ise === 1 ? '' : 's'}`);
  if (british.length) notes.push(`British idiom: ${british.join(', ')}`);

  return { label, words, contractions, longForms, emDashes, ise, notes };
};
