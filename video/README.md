# video/

Generates short exam-technique videos from topic packs, for Jamie's YouTube
channel. Phase 2 of the project; **the pipeline is not finished.**

The premise: Alex Lee already covers all 40 topics well. What nobody makes
videos about is the material this repo already holds in structured form — the
near-miss answers that score zero, and worked exam answers built against a real
mark scheme. Those are re-presentations of content already checked against the
textbook, so the videos inherit its accuracy instead of inventing new claims.

## What works now

    node video/build/scenes.mjs A1.1      # traps.md -> video/out/A1.1-traps/scenes.json

Deterministic, zero-dependency. Every sentence of biology is copied verbatim
from `traps.md`; the only text this stage introduces is fixed connective tissue
("People write:", "What scores instead:"). Each scene carries the content twice:

- `say` — for speech: topic codes expanded to titles, markdown stripped
- `show` — for the screen: markdown kept, so emphasis renders

Measured output: 3–4 minutes of narration per topic, which is the target length.

`video/build/preview.html` is the visual style prototype — open it with
`?beat=title|mistake|why|fix`. It exists to get the look approved before any
dependency is installed.

## What does not exist yet

- **Narration.** Needs a TTS key. Audio must be generated *before* rendering so
  scene durations come from measured audio rather than an estimate.
- **Rendering.** Planned as Remotion, which will be the first real dependency
  in this repo. It stays contained here: `tools/`, `web/` and the generated
  `index.html` remain zero-dependency, and the student's app never gains a
  build step.
- **Publishing.** Manual YouTube upload, then the id recorded per topic in
  `syllabus.json` and surfaced as a link (not an embed — his school laptop may
  block YouTube, and a link degrades gracefully).

## Output

`video/out/` is build output and is not tracked. Regenerate it.
