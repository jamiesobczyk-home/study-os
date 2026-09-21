# study-os: agent entry point

A study system for IB Diploma Programme courses, built for one specific student
who learns well from video and has been getting by on recognition rather than
recall. Read `README.md` for what it is and `docs/method.md` for why it is
built this way.

## Before you change anything

1. Read `docs/method.md`. Every design decision here follows from it. Anything
   that makes studying feel smoother by removing the retrieval step is a
   regression, however much nicer it looks.
2. To author or edit topic content, follow `.claude/skills/topic-pack/SKILL.md`.
   It is the standard, not a suggestion — consistency across packs is what
   makes the system usable across two years.

## Rules

- **No dependencies.** Bare Node 18+, as with the rest of Jamie's tooling.
  No package.json, no install step, no build.
- **Accuracy over completeness.** A confidently wrong card is worse than a
  missing one, because it gets memorised just as well and is not discovered
  until an exam. Verify against the syllabus rather than recalling. State your
  uncertainty in your reply so it can be checked against his course materials.
- **His textbook is the tiebreaker.** Andrew Allott, _Biology Study Guide_,
  Oxford 2023 (recorded in `courses/bio-hl/course.json`). Where content here
  disagrees with it, the book wins. Never cite a page number you were not
  given — `studyGuidePages` is `null` when unknown, and `null` does not mean
  guess.
- **Never invent a URL.** Channel pages and search URLs only, unless you have
  verified the link. A dead link is the thing that ends a study session.
- **Card ids are stable.** Progress in `study/<course>.progress.json` is keyed
  on them. Add cards at the end; never renumber.
- **`study/` is his data.** Do not edit progress files by hand, do not reset
  them to make output look tidier, and do not commit a cleared one over a real
  one.
- **Exam file structure is load-bearing.** `study exam` parses `## ` headings
  and `### Mark scheme` subheadings. Changing the shape breaks the reveal.

## Tone

He is struggling with this subject and will notice being managed. Write level
with him: plain, specific, honest that the uncomfortable step is the one that
works. "Simply" and "just" do not appear in this repo.

## Checks

There is no test suite. Before calling a change done:

    node tools/study.mjs list
    node tools/study.mjs progress
    node tools/study.mjs quiz <CODE> --all
    node tools/study.mjs exam <CODE>

The quiz is interactive and aborts cleanly on Ctrl-D, saving answers given so
far. Piped stdin will not exercise it — readline drops queued lines — so test
it in a real terminal.
