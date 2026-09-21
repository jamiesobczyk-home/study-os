/** Terminal helpers. No dependencies, and colour degrades to plain text. */
const on = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (on ? `\u001b[${code}m${s}\u001b[0m` : String(s));

export const bold = wrap('1');
export const dim = wrap('2');
export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const blue = wrap('36');

export const rule = (label = '') => {
  const width = Math.min(process.stdout.columns || 72, 72);
  if (!label) return dim('-'.repeat(width));
  const tail = Math.max(0, width - label.length - 3);
  return dim(`-- ${label} ${'-'.repeat(tail)}`.slice(0, width));
};

/** Wrap prose to the terminal width so long answers stay readable. */
export const para = (text, indent = '') => {
  const width = Math.min(process.stdout.columns || 72, 72) - indent.length;
  const out = [];
  for (const block of String(text).split('\n')) {
    if (!block.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of block.split(/\s+/)) {
      if (line && (line + ' ' + word).length > width) {
        out.push(indent + line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) out.push(indent + line);
  }
  return out.join('\n');
};

export const heading = (text) => `\n${bold(text)}\n`;
