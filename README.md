# study-os

A study system for IB Diploma Programme courses, built around the fact that
watching a video and being able to reproduce it are different skills.

It takes what he already learns well from — video — and adds the step that
makes it permanent: closing the laptop and trying to produce it from nothing.

First course in it: **Biology HL**.

## Setup

You need [Node](https://nodejs.org) 18 or newer — check with `node --version`.
There is nothing to install beyond that: no dependencies, no build step.

Get the repo onto the machine he will study on:

**Windows (PowerShell)**

    cd C:\Github
    git clone https://github.com/jamiesobczyk-home/study-os.git
    cd study-os
    .\study today

**macOS or Linux**

    git clone https://github.com/jamiesobczyk-home/study-os.git
    cd study-os
    ./study today

Every command below is run **from inside the `study-os` folder**. If you open a
fresh terminal, `cd` there first.

### Typing less

`study` is a wrapper around `node tools/study.mjs`, so these are the same thing:

    .\study quiz                      # Windows
    ./study quiz                      # macOS / Linux
    node tools/study.mjs quiz         # anywhere, from the repo folder

To run it from any folder without `cd`-ing first, add the repo to your PATH.
In PowerShell, permanently:

    [Environment]::SetEnvironmentVariable(
      'Path',
      [Environment]::GetEnvironmentVariable('Path','User') + ';C:\Github\study-os',
      'User')

Open a new terminal afterwards, and `study today` works from anywhere.

## Start here

    study today

That prints what is due and what a session looks like.

    study watch C1.2      # the video plan, and what to watch for
    study quiz            # retrieval practice on what is due
    study exam C1.2       # one exam question, then its mark scheme
    study progress        # the whole syllabus at a glance
    study list            # every topic, and which have packs
    study new D1.1        # scaffold a new topic pack
    study check           # verify pack structure
    study prompt D1.1     # a paste-ready pack prompt for another model

## The loop

Four steps, about forty minutes:

1. **Watch** one video, holding specific questions from the pack.
2. **Capture** — laptop closed, write down what you remember. Then read the
   matching section of his Allott study guide and mark what you missed.
3. **Recall** — quiz yourself, out loud, and grade honestly.
4. **Check** — one exam question with a real mark scheme, marked strictly.

Cards you get right come back in 1, 3, 7, 16 and 35 days. Cards you miss come
back tomorrow. So the deck concentrates itself on what you do not know.

Why it is built this way, and why step 2 feels awful: **[docs/method.md](docs/method.md)**.

## Read these

| Doc | Who it is for |
| --- | --- |
| [docs/method.md](docs/method.md) | Him. How this works and why. Read once. |
| [docs/for-parents.md](docs/for-parents.md) | You. What to do, and what to stay out of. |
| [docs/command-terms.md](docs/command-terms.md) | Him. Where marks get lost on questions he knew. |
| [docs/adding-a-course.md](docs/adding-a-course.md) | You. Adding Chemistry, Maths, anything. |
| [docs/offloading.md](docs/offloading.md) | You. Generating packs elsewhere, and what not to trust. |

## What is in here

    courses/bio-hl/
      course.json          assessment structure and weightings
      syllabus.json        all 40 topics, themes A-D, HL flags
      topics/<CODE>-<slug>/
        README.md          what this topic is, and how to approach it
        essentials.md      what he must be able to *do*
        videos.md          what to watch, and what to watch *for*
        cards.json         retrieval questions -> `study quiz`
        exam.md            exam questions + mark schemes -> `study exam`
        traps.md           where the marks actually go
    docs/                  the method, and the guides
    prompts/topic-pack.md  the pack prompt `study prompt` fills in
    study / study.cmd      launcher wrappers (POSIX / Windows)
    templates/topic-pack/  the skeleton `study new` copies
    tools/study.mjs        the CLI
    progress/              his study history, per course
    .claude/skills/        how Claude should build a topic pack

## State of the content

The **framework is complete**. The **content is three topics of forty.**

| | |
| --- | --- |
| Syllabus map | All 40 Biology HL topics |
| Packs built | **A1.1** Water, **B2.1** Membranes and transport, **C1.2** Cell respiration |
| Packs remaining | 37 |

The three are worked examples chosen to span the range — an easy foundational
topic, a mid-difficulty one where people first fall behind, and a hard HL one.
They define the standard for the rest.

## Building the other 37

Do not write them by hand. In a Claude session in this repo:

> build out the D1.1 topic pack

`.claude/skills/topic-pack/SKILL.md` defines what a good pack is, so output
stays consistent across sessions rather than drifting.

To generate them somewhere else — ChatGPT, another model — print a paste-ready
prompt:

    study prompt D1.1              # copy the output, paste it in
    study prompt D1.1 --example    # also show it a finished pack

It fills in the topic, theme, level, HL flag and study-guide pages from the
syllabus, so there is nothing to edit. `--example` appends a completed pack as
a worked example, which is worth doing the first few times. Then verify the
structure:

    study check D1.1     # one pack
    study check          # all of them

The checker catches broken card ids, an `exam.md` that will not parse, surviving
template placeholders and invented video URLs. It cannot tell you whether the
biology is right — see [docs/offloading.md](docs/offloading.md).

**Then check it against his actual course materials before he studies it.** A
wrong card gets memorised exactly as efficiently as a correct one. Build packs
a week ahead of his class, not the whole syllabus in one weekend.

## His textbook

**Andrew Allott, _Biology Study Guide_, Oxford Resources for IB DP, 2023
edition** (ISBN 9781382016438). Recorded in `courses/bio-hl/course.json`.

248 pages across 40 topics makes it revision-density, not a teaching text —
which is exactly what this system wants. It is a poor place to meet a topic
cold, and an excellent place to check yourself after the capture step. It is
also the reference to verify generated packs against: organised by the same
topic codes, so checking a pack's cards against its section takes ten minutes.
**Where a card disagrees with the book, the book wins.**

**Page numbers are in.** All 40 topics carry their page range in
`courses/bio-hl/syllabus.json`, transcribed from the book's contents page, so
`study watch` prints exactly which pages to check yourself against.

Note the book is ordered by **level** — 1 Molecules, 2 Cells, 3 Organisms,
4 Ecosystems — with the four themes inside each. So A1.1 and B1.1 are
neighbours while A1.1 and A2.1 are 55 pages apart. Find a topic by its code.

**Free exam practice.** Each theme-and-level group ends with a question set
(A1 Questions p. 8, C1 Questions p. 38, and so on), and the answers are
published free at <https://www.oxfordsecondary.com/ib-science-support>.
`study exam` points at the relevant set once the pack's own questions are done.

Two topics are printed under different titles from the syllabus — A4.2
("Conservation of biology") and D4.2 ("Sustainability and changes"). Recorded
as `studyGuideTitle`, and `study watch` says so, so it does not look like the
map is wrong.

## A caveat on the syllabus

The topic map follows the IB Biology syllabus first taught in 2023 (first exams
2025), cross-checked against a published topic list — the source is recorded in
`courses/bio-hl/syllabus.json`.

Two things to verify against the school's own course outline:

- **The `hlOnly` flags** mark topics that appear only in the HL course. Topics
  shared with SL still carry extra HL depth inside them, which one flag cannot
  capture.
- **The assessment weightings** in `course.json` are published headline figures,
  kept for prioritisation. Confirm exact mark totals and timings before using
  them for exam strategy.

Teaching order is the school's, not the syllabus's. Follow his class.

(The study guide's organisation was confirmed against its contents page on
2026-09-21, so this is no longer an assumption.)
