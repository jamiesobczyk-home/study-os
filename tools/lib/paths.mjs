import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Repository root, resolved from this file rather than the shell's cwd. */
export const ROOT = resolve(here, '..', '..');
export const COURSES = join(ROOT, 'courses');
export const STUDY = join(ROOT, 'study');
export const TEMPLATES = join(ROOT, 'templates');

export const courseDir = (course) => join(COURSES, course);
export const topicDir = (course, dir) => join(COURSES, course, 'topics', dir);
export const progressFile = (course) => join(STUDY, `${course}.progress.json`);
