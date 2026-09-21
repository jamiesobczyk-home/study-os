import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { COURSES, courseDir, topicDir } from './paths.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

export const listCourses = () =>
  readdirSync(COURSES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(COURSES, e.name, 'course.json')))
    .map((e) => e.name);

export const loadCourse = (course) => readJson(join(courseDir(course), 'course.json'));
export const loadSyllabus = (course) => readJson(join(courseDir(course), 'syllabus.json'));

/** Find a topic by its code, case-insensitively. Returns undefined if unknown. */
export const findTopic = (syllabus, code) => {
  const want = String(code).trim().toUpperCase();
  return syllabus.topics.find((t) => t.code.toUpperCase() === want);
};

/** True when a topic has an authored pack on disk, not just a syllabus row. */
export const hasPack = (course, topic) =>
  existsSync(join(topicDir(course, topic.dir), 'cards.json'));

/**
 * Load a topic's retrieval cards. Returns [] for a topic that is listed in the
 * syllabus but not yet authored, so callers can distinguish "no pack" from
 * "no cards" by checking hasPack first.
 */
export const loadCards = (course, topic) => {
  const file = join(topicDir(course, topic.dir), 'cards.json');
  if (!existsSync(file)) return [];
  const data = readJson(file);
  return (data.cards || []).map((c, i) => ({
    ...c,
    id: c.id || `${topic.code}-${String(i + 1).padStart(2, '0')}`,
    topic: topic.code,
  }));
};

/** Read a named markdown file out of a topic pack, or null when absent. */
export const readPackFile = (course, topic, name) => {
  const file = join(topicDir(course, topic.dir), name);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};
