# study-os

A study system for IB Diploma Programme courses, built around the fact that
watching a video and being able to reproduce it are different skills.

It takes what he already learns well from — video — and adds the step that
makes it permanent: closing the laptop and trying to produce it from nothing.

First course in it: **Biology HL**.

## Start here

    node tools/study.mjs today

That prints what is due and what a session looks like. Node 18 or newer, no
dependencies, no install step.

    node tools/study.mjs watch C1.2      # the video plan, and what to watch for
    node tools/study.mjs quiz            # retrieval practice on what is due
    node tools/study.mjs exam C1.2       # one exam question, then its mark scheme
    node tools/study.mjs progress        # the whole syllabus at a glance
    node tools/study.mjs list            # every topic, and which have packs
    node tools/study.mjs new D1.1        # scaffold a new topic pack

## The loop

Four steps, about forty minutes:

1. **Watch** one video, holding specific questions from the pack.
2. **Capture** — laptop closed, write down what you remember. Five minutes.
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
    templates/topic-pack/  the skeleton `study new` copies
    tools/study.mjs        the CLI
    study/                 progress state, per course
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

**Then check it against his actual course materials before he studies it.** A
wrong card gets memorised exactly as efficiently as a correct one. Build packs
a week ahead of his class, not the whole syllabus in one weekend.

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
