/**
 * What a topic pack is. Every tool that reads, writes, checks or generates a
 * pack takes its file list from here, so adding a file happens in one place.
 */
export const PACK_FILES = [
  { name: 'README.md', required: true, kind: 'md' },
  { name: 'essentials.md', required: true, kind: 'md' },
  { name: 'videos.md', required: true, kind: 'md' },
  { name: 'cards.json', required: true, kind: 'json' },
  { name: 'exam.md', required: true, kind: 'md' },
  { name: 'traps.md', required: true, kind: 'md' },
  // Authored multiple choice. Optional so an older pack still builds; without
  // it the quiz falls back to the questions derived from traps.md.
  { name: 'mcq.json', required: false, kind: 'json' },
];

export const PACK_FILE_NAMES = PACK_FILES.map((f) => f.name);
export const REQUIRED_FILES = PACK_FILES.filter((f) => f.required).map((f) => f.name);

/** The files a model is asked to write, in the order it should write them. */
export const GENERATED_FILES = [
  'essentials.md', 'videos.md', 'cards.json', 'mcq.json', 'exam.md', 'traps.md', 'README.md',
];
