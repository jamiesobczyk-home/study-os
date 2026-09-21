---
name: topic-pack
description: Author or improve a topic pack in this study repo — the five files that make one syllabus topic studiable (essentials, videos, cards, exam, traps). Use when asked to build, fill in, extend or fix a topic pack, add a topic, or add a course.
---

# Building a topic pack

A topic pack turns one syllabus topic into something a struggling student can
work through in forty minutes. It is five files in
`courses/<course>/topics/<CODE>-<slug>/`, plus a README.

Scaffold it first — this creates the directory with the template filled in:

    node tools/study.mjs new <CODE> --course <course>

Then write the content. Read an existing pack before you start: `A1.1-water`
is the reference for an easy topic, `C1.2-cell-respiration` for a hard one.

## Who you are writing for

A specific student: bright, struggling with this subject, learns well from
video, and has been getting by on recognition rather than recall. He will
believe what you write and memorise it. That has two consequences.

**Accuracy is not negotiable.** A confidently wrong card gets learned as
efficiently as a correct one, and it will survive until an exam tells him
otherwise. If you are not certain of a fact, do not write a card for it.
Verify against the syllabus rather than recalling from memory, and when
something is genuinely uncertain, say so in the file rather than smoothing
over it.

His textbook is **Andrew Allott, _Biology Study Guide_, Oxford, 2023 edition**
(ISBN 9781382016438), recorded in `courses/bio-hl/course.json`. It is organised
by the same topic codes. You will not usually have its text — do not pretend to
— but it is the reference a human will check your pack against, and **where a
card disagrees with it, the book wins.** Flag anything you are unsure of in
your reply so it gets checked against that section before he learns it.

Never cite a page number you have not been given. The topic code locates the
section; `studyGuidePages` in `syllabus.json` holds page ranges when a human
has filled them in, and `null` means unknown, not "guess".

**Never invent a URL.** A dead link on a Tuesday night is the thing that makes
someone close the laptop. Link to channel pages and YouTube *search* URLs,
which do not rot, and leave a "Pinned" section for real URLs once verified.
Do not guess a video ID, ever.

## The five files

### `essentials.md` — what he must be able to *do*

Checkbox list, each item a capability, not a topic heading. "Explain why a
water molecule is polar" — not "Polarity".

Sections: **Core**, **Higher level** (omit if the topic has none), **Links to
other topics**, and **Vocabulary that has to be exact**.

The links section earns its place. Say *why* two topics connect and what it
buys him — "this is A1.1 applied one level up; if B2.1 will not stick the
problem is usually back in A1.1". Paper 2 rewards linking, and knowing a topic
is a reapplication rather than a new pile is worth real motivation.

The vocabulary table has three columns: term, what it means, **what it is
not**. The third column does most of the work.

### `videos.md` — what to watch, and what to watch *for*

Structure: **Main**, then **If that did not land**, then **Worth it once**,
then **Pinned**.

Two things make this file useful rather than a link dump:

- **"Watch for" bullets.** Specific questions to hold while watching. This is
  what turns passive watching into active watching, and it is the whole reason
  the file exists.
- **A "pause at" instruction.** One moment in the video worth stopping on, and
  what to do when stopped.

Push back on watching more than one video. Say why — a second explanation of
the same idea builds recognition, which is the problem this system exists to
solve. The exception worth making is an **animation** for a spatial or
mechanical idea (a pump changing shape, protons turning a turbine); those are
genuinely cheaper to learn from movement than from prose, and you should say so.

Alex Lee's channel is built against the current IB Biology syllabus topic by
topic, so it is the default first suggestion for Biology. Amoeba Sisters, Khan
Academy and Crash Course are useful as *different* explanations, not repeats.

### `cards.json` — retrieval questions

The file the quiz reads. Shape:

```json
{
  "topic": "B2.1",
  "title": "Membranes and membrane transport",
  "cards": [
    { "id": "B2.1-01", "q": "...", "a": "...", "note": "...", "tags": ["core"] }
  ]
}
```

- `id` — `<CODE>-NN`, sequential. Stable: **never renumber an existing card**,
  because progress is keyed on it. Add new cards at the end.
- `q` — must force production, not recognition. "Why is water polar? Give the
  full reason, not just the label" beats "What is polarity?". Questions that
  can be answered "yes" are broken.
- `a` — written the way a mark scheme would accept it, in full sentences. He
  reads this to judge whether what he said was good enough, so it has to model
  a scoring answer.
- `note` — optional, and the highest-value field. Use it for the bit people get
  wrong, a mnemonic that is not cringeworthy, or why the obvious answer misses.
- `tags` — `core`, `hl`, plus topic-specific ones.

**12 to 18 cards.** Fewer and the topic is not covered; more and a review
session stops fitting in the time he will actually give it.

Cover: every Core bullet in `essentials.md`, every HL bullet, and at least one
card that states a common misconception and corrects it. Include one
**synthesis card** that forces several facts together — a summary table, a
full pathway, the four locations as a set.

### `exam.md` — questions with real mark schemes

Parsed by `study exam`: each question is a `## ` heading, and the scheme is
under a `### Mark scheme` subheading. Keep that structure exactly or the
reveal breaks.

Five or six questions spanning the command terms that actually appear for this
topic — and *name* the command term in the question, because half the value
here is training him to read it.

Every question needs:
- A **mark allocation** in the question, `**[4]**`.
- **Marking points as separate bullets**, each worth a stated mark, phrased as
  a real mark scheme is: slashes for acceptable alternatives, "accept:" lines.
- An **examiner note** saying what separates a full-mark answer from a
  near-miss. This is the most useful line in the file. Make it specific to this
  question — "an answer that says 'active transport moves glucose in' scores one
  mark at most, because the question is asking for the chain".

### `traps.md` — where the marks go

Four to eight entries. Each is a heading naming the mistake, then three labelled
parts: **Commonly written**, **Why it does not score**, **Scores instead**.

Draw on what students actually write: describing when asked to explain, stating
one half of a two-directional effect, naming a condition instead of a reason,
using a term loosely. The final part must be a sentence he could actually write
in an exam, not advice about writing one.

### `README.md` — the pack's front door

Keep the template's metadata and file table. Replace the placeholder with:

- **The one-sentence version.** What the topic is actually about, in a sentence
  he could say to a friend. Write it last.
- **Why this topic is worth getting right** — or, for a hard topic, *why it is
  hard and what to do differently*. C1.2 tells him to watch in stages across
  three days and draw the pathway from memory; that instruction is worth more
  than another card. Give topic-specific advice, not a generic pep talk.

Set `**Status:** ready` when the pack is complete.

## Voice

Direct, plain, and level with him. He is struggling, and he can tell when he is
being managed.

- Say the uncomfortable thing plainly: the capture step will feel bad, and that
  is the step that works.
- Never imply the material is easy. "Simply" and "just" are banned.
- Be specific about payoff — "four later topics get easier" beats "this is
  important".
- Normalise failure without lowering the bar. Missed cards are the system
  working. Marks are still marks.

The repo's prose standards are in `.claude/skills/writing/SKILL.md` in the
operating-system repo if it is available; the short version is draft first,
then cut, and put the thing you want remembered at the end of the sentence.

## Before you call it done

- [ ] `node -e "require('./courses/<course>/topics/<dir>/cards.json')"` parses.
- [ ] Card ids are sequential and unique, and no existing id changed.
- [ ] `node tools/study.mjs quiz <CODE> --all` runs and shows every card.
- [ ] `node tools/study.mjs exam <CODE>` reveals a mark scheme correctly.
- [ ] Every Core and HL bullet in `essentials.md` has at least one card.
- [ ] No invented URLs. Channel and search links only, unless verified.
- [ ] Status set to `ready` in the pack README.
- [ ] No invented page numbers for the study guide.
- [ ] You have stated, in your reply, anything you were not certain of — so it
      can be checked against the Allott study guide before he learns it.
