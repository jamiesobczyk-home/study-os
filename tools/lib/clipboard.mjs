/**
 * The system clipboard, as UTF-8, with no dependencies.
 *
 * On Windows this goes through PowerShell with the encoding set explicitly.
 * Piping text between a program and Windows PowerShell 5 re-encodes it in the
 * console code page, which turns curly apostrophes and dashes into "?". The
 * traps labels contain a curly apostrophe, so that would break a pack.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, args, input) => execFileSync(cmd, args, {
  encoding: 'utf8',
  input,
  maxBuffer: 32 * 1024 * 1024,
  stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'ignore'],
});

const linuxTools = {
  read: [['wl-paste', ['--no-newline']], ['xclip', ['-o', '-selection', 'clipboard']], ['xsel', ['-ob']]],
  write: [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['-ib']]],
};

const firstThatWorks = (tools, input) => {
  for (const [cmd, args] of tools) {
    try {
      return run(cmd, args, input);
    } catch {
      // try the next one
    }
  }
  throw new Error('no clipboard tool found');
};

/** Read the clipboard. Throws with a usable message. */
export const readClipboard = () => {
  try {
    if (process.platform === 'win32') {
      return run('powershell.exe', [
        '-NoProfile', '-Command',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw',
      ]);
    }
    if (process.platform === 'darwin') return run('pbpaste', []);
    return firstThatWorks(linuxTools.read);
  } catch {
    throw new Error("Couldn't read the clipboard. Save the reply to a file and pass the file name instead.");
  }
};

/** Put text on the clipboard. Throws with a usable message. */
export const writeClipboard = (text) => {
  try {
    if (process.platform === 'win32') {
      // Through a UTF-8 file, so the text never crosses a console pipe.
      const dir = mkdtempSync(join(tmpdir(), 'study-'));
      const file = join(dir, 'clip.txt');
      try {
        writeFileSync(file, text, 'utf8');
        run('powershell.exe', [
          '-NoProfile', '-Command',
          `Get-Content -Raw -Encoding UTF8 -LiteralPath '${file.replace(/'/g, "''")}' | Set-Clipboard`,
        ]);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
      return;
    }
    if (process.platform === 'darwin') {
      run('pbcopy', [], text);
      return;
    }
    firstThatWorks(linuxTools.write, text);
  } catch {
    throw new Error("Couldn't write to the clipboard. Run the command without --copy and copy the output yourself.");
  }
};
