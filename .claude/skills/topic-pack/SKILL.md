---
name: topic-pack
description: Author or improve a topic pack in this study repo — the files that make one syllabus topic studiable (essentials, videos, cards, quiz questions, exam, traps). Use when asked to build, fill in, extend or fix a topic pack, add a topic, or add a course.
---

# Building a topic pack

> A self-contained version of this standard, for a model with no access to this
> repo, lives in `prompts/topic-pack.md`. If you change the pack format here,
> change it there too — and in `tools/lib/check.mjs`, which enforces it.

A topic pack turns one syllabus topic into something a struggling student can
work through in forty minutes. It is seven files in
`courses/<course>/topics/<CODE>-<slug>/`: essentials, videos, cards, mcq,
exam, traps and a README. The list lives in one place, `tools/lib/pack.mjs`,
and everything else reads it.

Scaffold it first — this creates the directory with the template filled in:

    study new <CODE> --course <course>

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

Never invent a page number. All 40 are already recorded as `studyGuidePages`
in `syllabus.json` — read them from there, and use `studyGuideTitle` when the
book prints a different title from the syllabus (A4.2 and D4.2 do).

**Never invent a URL.** A dead link on a Tuesday night is the thing that makes
someone close the laptop. Outside `## Pinned`, use YouTube **search** URLs only
(`https://www.youtube.com/results?search_query=...`) — they cannot rot. Do not
write channel URLs or `@handles`: they change, and you cannot open one to check.
`## Pinned` is where a human puts a real URL after opening it.

This is not hypothetical. An invented `@AlexLeeBiology` handle shipped to the
student and 404'd; `study check` now refuses any non-search YouTube link outside
Pinned.

## The files

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
  and when rebuilding an existing pack, keep every id attached to the question
  it already had. Progress is keyed on ids, so reusing one for a different
  question corrupts his review history. His progress lives in his browser,
  where no check in this repo can see it, so treat every existing id as
  studied: reword freely, but keep each id on the same idea, add new cards at
  the end, and never delete one.
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

### `mcq.json` — multiple choice for the quiz

The app's Quiz tab mixes these with questions it derives from `traps.md`.

```json
{ "topic": "B1.2",
  "questions": [
    { "id": "B1.2-q01",
      "stem": "Which bonds hold a protein's secondary structure together?",
      "options": [
        { "text": "Hydrogen bonds between backbone amine and carboxyl groups", "correct": true,
          "why": "The alpha helix and beta pleated sheet are the backbone folding on itself, so the R groups aren't involved yet." },
        { "text": "Ionic bonds between oppositely charged R groups", "correct": false,
          "why": "That's tertiary structure. R-group bonds shape the whole chain, not the helix." }
      ] } ] }
```

(Two options shown to keep it short; every question needs four.)

The app shuffles the options. A right pick shows "Correct." and that option's
`why`; a wrong pick shows "Not this one.", the `why` of what he picked, then
the right answer and its `why`. The rules follow from that:

- **10 to 14 questions, four options each, exactly one correct, a `why` on
  every option.** `study check` errors on any of these.
- **Ids `<CODE>-q01`…, sequential and permanent**, same rule as card ids. The
  quiz store is keyed on them.
- **A wrong option's `why` explains why *that* option fails**, and names what
  it actually describes when it's a real thing in the wrong place. Don't open
  with "No"/"Incorrect" or "Correct"/"Right"; the app already says it.
- **Distractors are real misconceptions**, ideally the topic's own traps, and
  clearly wrong by the pack's content, never arguably right.
- **No length tell.** The first trap-derived quiz had correct answers twice
  as long as the wrong ones, which teaches picking the longest. Match
  distractors in length and detail. `study check` warns when the correct option
  is the longest in more than 40% of a pack (chance is 25%) or runs 1.5× the
  average distractor on any one question. The first 48 authored questions sit
  at exactly 25%.
- No "all of the above" or "none of the above".
- **Options in exam register; `why` in the plain voice below.**
- Test only what the pack itself says. The pack has been checked against the
  book; a true fact from elsewhere hasn't.

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
parts: **Commonly written**, **Why it doesn’t score**, **Scores instead**.

Draw on what students actually write: describing when asked to explain, stating
one half of a two-directional effect, naming a condition instead of a reason,
using a term loosely. The final part must be a sentence he could actually write
in an exam, not advice about writing one.

### `README.md` — the pack's front door

`## The one-sentence version` is load-bearing: `tools/build-web.mjs` extracts
the sentence under it for the topic subtitle in the browser app. Keep the
heading verbatim, and write a real sentence — a leftover `_italic placeholder_`
is treated as empty.

Keep the template's metadata and file table. Replace the placeholder with:

- **The one-sentence version.** What the topic is actually about, in a sentence
  he could say to a friend. Write it last.
- **Why this topic is worth getting right** — or, for a hard topic, *why it is
  hard and what to do differently*. C1.2 tells him to watch in stages across
  three days and draw the pathway from memory; that instruction is worth more
  than another card. Give topic-specific advice, not a generic pep talk.

Set `**Status:** ready` when the pack is complete.

## Voice

The student is 17. If the writing sounds machine-generated he will stop reading
before he reaches any biology, and that is worth more than any amount of
polish. This repo has already been called out for exactly that, and the cause
was measurable: over four thousand words of copy with **zero contractions**.

**Write contractions.** "It isn't broken", not "It is not broken". "That's why",
not "That is why". Long forms outnumbering contractions is the loudest tell
there is, and `study voice` counts them.

**No closing maxims.** The strongest pattern in the old copy was every
paragraph landing on a little aphorism. One is a nice line. Thirty in a row is
a TED talk:

    Don't   Missing cards is the system working, not you failing.
    Do      Getting them wrong is how it finds your gaps.

    Don't   Reading one and agreeing with it is worth nothing.
    Do      Reading the mark scheme and nodding along doesn't count.

**One em-dash per few hundred words, not per sentence.** Most are a period or a
comma doing rhetorical cosplay.

**American idiom and spelling** in anything he reads: *backwards*, not *the
wrong way round*; *go write*, not *go and write*; *organized*, *synthesized*,
*analyze*.

**No sentence fragments for effect.** "Nothing pushes." reads as a writer
admiring their own line.

### The exception that matters

Plain does not mean vague. **Marks come from the terminology, not the
formality**, so every technical term stays exactly where it was:

    Before  Denaturation is the disruption of a protein's three-dimensional
            conformation, causing loss of function. Peptide bonds are not
            broken, so the primary structure remains intact.

    After   Denaturation is when a protein loses its 3D shape and stops
            working. Peptide bonds aren't broken, so the primary structure
            stays intact.

Every marking term survives. Only the stiffness goes. Dropping "hydrogen bonds"
to sound casual would cost him a mark, and that is the one way this can do harm.

The numbered bullets under `### Mark scheme` are the exception to the
exception: leave those in mark-scheme language. They reproduce an artifact he
meets in the exam, and he needs to recognize that register on sight. The
examiner note underneath is prose and follows the rules above.

Also: never imply the material is easy. "Simply" and "just" are banned. Be
specific about payoff, and normalize failure without lowering the bar.

The repo's prose standards are in `.claude/skills/writing/SKILL.md` in the
operating-system repo if it is available; the short version is draft first,
then cut, and put the thing you want remembered at the end of the sentence.

## Before you call it done

- [ ] `study check <CODE>` reports no errors.
- [ ] `study build` run, and the topic viewed in `index.html`.
- [ ] No existing card or quiz id moved to a different idea. The checker
      warns on changed wording but can't judge whether the idea moved; you must.
- [ ] `mcq.json` passes with no length-tell warning.
- [ ] `study quiz <CODE> --all` runs and shows every card.
- [ ] `study exam <CODE>` reveals a mark scheme correctly.
- [ ] Every Core and HL bullet in `essentials.md` has at least one card.
- [ ] No invented URLs. Channel and search links only, unless verified.
- [ ] No LaTeX. Equations are plain text (p² + 2pq + q² = 1); `study check`
      rejects `\(`, `\sqrt` and the like.
- [ ] Status set to `ready` in the pack README.
- [ ] No invented page numbers for the study guide.
- [ ] `study voice <CODE>` shows contractions present and long forms near zero.
- [ ] You have stated, in your reply, anything you were not certain of — so it
      can be checked against the Allott study guide before he learns it.
