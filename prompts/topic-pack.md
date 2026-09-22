# Portable topic-pack prompt

**Do not paste this file by hand.** Generate a filled-in copy instead:

    study prompt B1.2              # copy the output, paste into ChatGPT
    study prompt B1.2 --example    # also show it a finished pack

That substitutes the topic, theme, level, HL flag and study-guide page range
from the syllabus, and appends the verified channel URLs — none of which this
raw file contains. Pasting the raw file leaves `<CODE>` placeholders in the
prompt and gives the model no link it is allowed to use.

When the reply comes back, save the six files into
`courses/bio-hl/topics/<CODE>-<slug>/` and run:

    study check <CODE>    # structure, and card ids that shifted
    study links <CODE>    # every link fetched; dead ones fail
    study build           # regenerate the page he studies from

Fix anything they report, then check the biology against the study guide before
he studies from it. The text below is the template those commands fill in.

---

You are writing a study pack for one specific student: a Year 12 student taking
IB Biology HL, struggling with the subject, who learns well from video and has
been relying on recognising explanations rather than being able to produce them.
He will believe and memorise what you write.

Produce a study pack for **IB Biology topic `<CODE>` — `<TITLE>`** (2023
syllabus, first exams 2025).

## Rules that override everything else

1. **Accuracy first.** A confidently wrong card is worse than a missing one: it
   gets memorised just as efficiently and is not discovered until an exam. If
   you are not certain of a fact, leave it out. At the very end, list anything
   you were unsure about under a heading `UNCERTAIN` so a human can check it.
2. **Never invent a URL.** You may produce exactly two kinds of link: YouTube
   *search* URLs of the form `https://www.youtube.com/results?search_query=...`,
   which cannot rot, and URLs copied **verbatim** from the verified list at the
   end of this prompt. **Invent nothing else** — no guessed `@handles`, no video
   ids. A handle guessed from a channel name once shipped to this student and
   404'd. A dead link is what ends a study session.
3. **Never invent a page number** for any textbook.
4. **Follow the file formats below exactly.** Your output is not just read by
   a person — it is parsed and rendered into a web app the student studies
   from. `cards.json` becomes his flashcards, `exam.md` becomes the
   reveal-the-mark-scheme screen, and the markdown files are rendered as pages.
   Deviating from the formats below breaks those screens.

   Write plain, ordinary markdown: headings, lists, tables, bold, italic,
   links, fenced code blocks. Do not write raw HTML.

## Output format

Return exactly six files, each introduced by a line of the form `=== FILENAME ===`
and nothing else between them. No commentary before or after, except the
`UNCERTAIN` list at the very end.

### `=== essentials.md ===`

Markdown. A `## Core` section, then `## Higher level` (omit if the topic has no
HL-only content), then `## Links to other topics`, then
`## Vocabulary that has to be exact`.

Core and Higher level are checkbox lists, `- [ ] `, and **each item must be a
capability, not a heading** — "Explain why a water molecule is polar", not
"Polarity". Aim for 10–16 across both sections.

Links section: name the other topic code and say *why* they connect and what it
buys him. The vocabulary table has three columns: Term, What it means, **What it
is not**. The third column does most of the work.

### `=== videos.md ===`

Markdown. Sections: `## Main`, `## If that did not land`,
`## Worth it once, not for revision`, `## Pinned` (left blank for him to fill in).

Open with a short instruction to watch **one** video, not several, and say why:
a second explanation of the same idea builds recognition, which is the problem
this whole system exists to fix. Make one exception where it is genuinely
earned — for a spatial or mechanical idea (a pump changing shape, a molecule
being threaded), an **animation** teaches things prose cannot, and you should
say so.

Under `## Main`, include:
- A search URL. Add a channel link **only** if it appears in the verified list
  at the end of this prompt — those are URLs a person has actually opened.
- **"Watch for:"** — 2–4 specific questions to hold while watching. This is the
  most important part of the file; it is what turns passive watching into active
  watching.
- **"Pause at:"** — one moment worth stopping on, and what to do when stopped.

For IB Biology, Alex Lee's series (channel name "Mister Lee Science") is widely
recommended by IB students and is reported to follow the 2023 syllabus topic by
topic, so it is the default first suggestion. Use its verified URL from the list
at the end of this prompt, and write the search query around the channel name.
Amoeba Sisters, Khan Academy and Crash Course are useful as *different*
explanations, not as repeats.

### `=== cards.json ===`

Valid JSON, this shape exactly:

```json
{
  "topic": "<CODE>",
  "title": "<TITLE>",
  "cards": [
    {
      "id": "<CODE>-01",
      "q": "A question that forces production, not recognition.",
      "a": "The answer, in full sentences, phrased as a mark scheme would accept it.",
      "note": "Optional: the bit people get wrong, or why the obvious answer misses.",
      "tags": ["core"]
    }
  ]
}
```

- **12 to 18 cards.** Fewer does not cover the topic; more stops fitting a
  review session.
- `id` must be `<CODE>-01`, `<CODE>-02`, … strictly sequential from 01. No gaps.
- **If you are rebuilding a pack that already exists, ids are not yours to
  reassign.** A student's review history is keyed on them: how well he knows
  each card, and when it is next due. Keep every existing id attached to the
  question it already had, and add new cards at the end. Silently reusing
  `<CODE>-05` for a different question credits him for a card he never saw and
  re-tests one he had mastered. This has already happened twice.
- `q` must be impossible to answer yes/no and must force recall. "Why is water
  polar? Give the full reason, not just the label" beats "What is polarity?".
- `a` must be a full, scoring answer in sentences — he reads it to judge whether
  what he said was good enough, so it has to model a real answer. Never a
  fragment.
- `note` is the highest-value field. Use it for the common error or the
  distinction people miss. Use it on several cards.
- `tags`: `core` or `hl`, plus topic-specific tags.
- Cover every Core and Higher level bullet from `essentials.md`.
- Include at least one card that **states a common misconception and corrects
  it**, and one **synthesis card** forcing several facts together (a full
  pathway, a summary table, a set of locations).

### `=== exam.md ===`

Markdown, parsed by a tool. **Structure is load-bearing:**

```
## Q1. <Command term> ... **[4]**

<the question>

### Mark scheme

- <marking point>. **[1]**
- <marking point>. **[1]**

_Examiner note: <what separates full marks from a near miss>._
```

- 5 or 6 questions. Each `## ` heading, each mark scheme under `### Mark scheme`
  spelled exactly that way.
- **Name the command term** in the question (explain, outline, distinguish,
  compare and contrast, state, suggest) — half the value is training him to read
  it — and put the mark allocation in the heading as `**[4]**`.
- Write mark schemes as real ones read: slashes for acceptable alternatives,
  "accept:" lines, one mark per separate point.
- The **examiner note is the most useful line in the file.** Make it specific to
  that question — "an answer that says 'active transport moves glucose in'
  scores one mark at most, because the question asks for the chain" — not
  generic advice.

### `=== traps.md ===`

Markdown. 4–8 entries. Each is a `## ` heading naming the mistake, then three
labelled parts:

```
## <the mistake, as a heading>

**Commonly written:** <the near-miss answer students actually write.>

**Why it doesn’t score:** <the specific thing the mark scheme wanted.>

**Scores instead:** <the version that gets the mark.>
```

"Scores instead" must be a sentence he could literally write in an exam, not
advice about writing one. Draw on real failure modes: describing when asked to
explain, giving one half of a two-directional effect, naming a condition instead
of a reason, using a term loosely.

### `=== README.md ===`

```
# <CODE> <TITLE>

- **Theme:** <letter> — <theme name>
- **Level:** <Molecules|Cells|Organisms|Ecosystems>
- **Level of study:** <SL and HL | HL only>
- **Status:** ready

## The one-sentence version

<What this topic is actually about, in one sentence he could say to a friend.>

<!-- Keep this heading exactly as written. The web app pulls the sentence
     beneath it and shows it as the subtitle on the topic screen. Rename the
     heading and the subtitle silently disappears. -->

## Why this topic is worth getting right

<Topic-specific. For a hard topic, say why it is hard and what to do
differently — "watch this in three sittings and draw the pathway from memory
between them" is worth more than another card. Not a generic pep talk.>

## In your study guide

Allott, _Biology Study Guide_ (2023), **section <CODE>**. Read it *after* the
capture sheet, never before — it is condensed enough to make a fast check of
what you left out, and a slow way to meet the topic for the first time.

## What's in this pack

| File | What it is |
| --- | --- |
| `essentials.md` | What you have to be able to do, in plain English |
| `videos.md` | What to watch, and what to watch *for* |
| `cards.json` | Retrieval questions — `study quiz <CODE>` reads these |
| `exam.md` | Exam-style questions with real mark schemes |
| `traps.md` | Where marks get lost on this topic |

## How to work through it

    study watch <CODE>
    study quiz  <CODE>
    study exam  <CODE>
```

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

Never imply the material is easy. **The words "simply" and "just" must not
appear anywhere in your output.** Be specific about payoff, and normalize
failure without lowering the bar.
