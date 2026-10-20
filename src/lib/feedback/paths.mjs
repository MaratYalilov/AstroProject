import path from 'node:path';

function within(base, dir) {
  const relative = path.relative(base, dir);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
}
/** Private data is outside public assets and survives ordinary site rebuilds. */
export function feedbackDataDir() {
  const dir = path.resolve(process.env.FEEDBACK_DATA_DIR || '.data/feedback');
  for (const base of ['public', 'dist/client', '../assets']) {
    if (within(path.resolve(base), dir)) throw new Error('FEEDBACK_DATA_DIR must be outside public assets');
  }
  if (within(process.cwd(), dir) && !within(path.resolve('.data'), dir)) {
    throw new Error('Inside the project, use .data/ for private feedback storage');
  }
  return dir;
}
