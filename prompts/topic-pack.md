# Topic-pack prompt template

**Don't paste this file.** Generate a filled-in copy with one of:

    study prompt D1.1                # a new topic: all seven files
    study prompt B1.2 --rebuild      # redo an existing topic, keeping every id
    study prompt B1.2 --quiz         # quiz questions only, from the pack's own content
    ...add --example to show the model a finished pack, --copy to put it
    on the clipboard

Then copy the model's whole reply and run `study import <CODE>` (add
`--replace` when it overwrites files that exist, `--quiz` for a quiz-only
reply). The importer checks the reply before writing anything.

Everything below the rule is the template. `{{NAME}}` is filled in by
`tools/lib/prompt.mjs`; `{{#mode}}...{{/mode}}` blocks are kept only in that
mode (`new`, `rebuild`, `quiz`, and `pack`, which means new or rebuild).
`study prompt` fails if any `{{` survives, so a renamed placeholder can't
reach the model.

---

# IB Biology study material: {{CODE}} {{TITLE}}

## Who it's for

One student. He's 17, in 11th grade at an American school, taking IB Biology
HL (2023 syllabus, first exams 2025), and he's struggling with it. He learns
well from video, and he's been getting by on recognizing explanations rather
than producing them. Everything here exists to make him produce answers.

He'll believe and memorize whatever you write. A wrong fact costs more than a
missing one, because it gets learned just as well and nobody finds it until an
exam.

What you write isn't only read. It's parsed into a web app he studies from:
`cards.json` becomes flashcards, `mcq.json` becomes a multiple-choice quiz,
`traps.md` becomes more quiz questions, `exam.md` becomes a reveal-the-mark-scheme
screen, and the markdown files are rendered as pages. The formats below are
exact because code reads them.

## The job

{{#new}}Write the complete pack for **{{CODE}} {{TITLE}}**: the seven files
specified below.{{/new}}{{#rebuild}}Rebuild the pack for **{{CODE}} {{TITLE}}**: all seven files
specified below, written fresh and better than what's there now.

This pack already exists and he's been studying it. His progress is saved on
his own device, keyed on the ids of the cards and quiz questions, and you're
the only thing that can keep those ids pointing at the right ideas. The current
ids are listed near the end under **Ids already in use**. The rule:

- **Keep every id, on the same idea.** `{{CODE}}-05` has to test the same thing
  after the rebuild as before it. Reword the question and answer as much as you
  like, but don't move the idea to a different id.
- **Add new cards and questions at the end**, continuing the numbering.
- **Never delete an id.** If an old card was weak, fix it under its own id.

The importer rejects a reply that drops any existing id and shows every
reworded question beside its old version, so a moved idea gets caught. Get it
right here instead.{{/rebuild}}{{#quiz}}Write **`mcq.json` only**: multiple-choice questions for
**{{CODE}} {{TITLE}}**.

This topic's pack already exists and has been checked against his textbook.
It's pasted near the end under **Source material**. **Test only what's in it.**
Don't bring in facts from anywhere else, even true ones, because the source
material is what he's been taught from and what's been verified. Build
distractors from the misconceptions in its `traps.md` wherever they fit.
{{EXISTING_QUIZ_RULE}}{{/quiz}}

## Hard constraints

1. **Accuracy first.** If you aren't certain of a fact, leave it out and list
   it under `UNCERTAIN` at the end of your reply.
2. **Never invent a URL.** You may write YouTube *search* URLs
   (`https://www.youtube.com/results?search_query=...`) and URLs copied exactly
   from **Verified links** near the end. Nothing else: no guessed `@handles`,
   no video ids. A guessed handle once shipped to him and 404'd.
3. **Never invent a page number** for any book.
4. **Exact formats.** Plain markdown only (headings, lists, tables, bold,
   italic, links). No raw HTML.
5. **Ids are sequential and permanent**: `{{CODE}}-01`, `{{CODE}}-02`... for
   cards and `{{CODE}}-q01`, `{{CODE}}-q02`... for quiz questions, no gaps.
6. **Reply shape.** Each file starts with a line `=== filename ===` and runs
   until the next one. Don't wrap files in code fences. After the last file,
   add `UNCERTAIN` on its own line followed by a bulleted list (or "- none").
   Nothing else before, between or after.

## Voice

If the writing sounds machine-generated he stops reading before he reaches any
biology. This project already got called out for that, and the cause was
measurable: four thousand words of copy with zero contractions. So:

- **Write contractions.** "It isn't", "that's why", "doesn't". Long forms
  outnumbering contractions is the loudest tell.
- **No closing maxims.** Don't land paragraphs on a little aphorism.
- **At most one em-dash every few hundred words.** Use a period or a comma.
- **American spelling and idiom**: organized, analyze, *backwards* not *the
  wrong way round*. (Keep *haemoglobin*, which is how his course spells it.)
- **No sentence fragments for effect.** "Nothing pushes." reads as a writer
  admiring their own line.
- **"Simply" and "just" don't appear anywhere.** Never imply it's easy.

**Plain isn't vague.** Marks come from terminology, not formality, so every
technical term stays:

    Stiff   Denaturation is the disruption of a protein's three-dimensional
            conformation, causing loss of function. Peptide bonds are not
            broken, so the primary structure remains intact.
    Plain   Denaturation is when a protein loses its 3D shape and stops
            working. Peptide bonds aren't broken, so the primary structure
            stays intact.

    Stiff   Incorrect. Hydrogen bonds are intermolecular attractions and
            therefore do not occur within a single water molecule.
    Plain   Those are polar covalent bonds. Hydrogen bonds form between
            separate molecules.

    Stiff   Missing cards is the system working, not you failing.
    Plain   Getting them wrong is how it finds your gaps.

Two places keep a formal register on purpose: the bulleted marking points
under `### Mark scheme` (he needs to recognize that register in the exam) and
the answer options in `mcq.json` (they're what he'd write on the paper).

## The files

{{#pack}}### `essentials.md`

`# {{CODE}} {{TITLE}} — what you need to be able to do`, then `## Core`,
`## Higher level` (leave it out if the topic has no HL-only content),
`## Links to other topics`, `## Vocabulary that has to be exact`.

Core and Higher level are `- [ ] ` checkbox lists, 10 to 16 items across both,
and each item is something he can *do*: "Explain why a water molecule is
polar", not "Polarity". Links name the other topic code and say what the
connection buys him. The vocabulary table has three columns, `Term`, `What it
means`, `What it’s not`, and the third column does most of the work.

### `videos.md`

`# {{CODE}} {{TITLE}} — what to watch`, then a short opening telling him to
watch **one** video and why: a second explanation of the same idea builds
recognition, which is the problem. One exception is allowed where it's
earned: a spatial or mechanical process (a pump changing shape) is worth an
animation, and you should say so.

Sections: `## Main`, `## If that didn’t land`, `## Worth it once, not for
revision`, and `## Pinned` (leave it empty; he fills it in). Under `## Main`:

- a search URL, plus a channel link only if it's in **Verified links**;
- **Watch for:** two to four specific questions to hold while watching (the
  most important part of the file);
- **Pause at:** one moment worth stopping on, and what to do when stopped.

Alex Lee's IB Biology series (channel "Mister Lee Science") follows the 2023
syllabus topic by topic, so it's the default first suggestion. Amoeba Sisters,
Khan Academy and Crash Course are for a *different* explanation, not a repeat.

### `cards.json`

```
{ "topic": "{{CODE}}", "title": "{{TITLE}}",
  "cards": [
    { "id": "{{CODE}}-01",
      "q": "A question that forces him to produce the answer.",
      "a": "A full scoring answer in sentences.",
      "note": "Optional: the mistake people make, or why the obvious answer misses.",
      "tags": ["core"] } ] }
```

- 12 to 18 cards covering every Core and Higher level item.
- `q` can't be answered yes or no. "Why is water polar? Give the full reason,
  not the label" beats "What is polarity?"
- `a` is a complete answer a mark scheme would accept. He compares what he
  said against it, so it has to model a real answer, never a fragment.
- `note` is the highest-value field. Use it on several cards.
- `tags`: `core` or `hl`, plus topic tags.
- At least one card that states a common misconception and corrects it, and
  one synthesis card that forces several facts together.

### `exam.md`

`# {{CODE}} {{TITLE}} — exam practice`, then 5 or 6 questions, each exactly:

```
## Q1. <Command term> ... **[4]**

<the question>

### Mark scheme

- <marking point>. **[1]**
- <marking point>. **[1]**

_Examiner note: <what separates full marks from a near miss on this question>._
```

Name the command term (explain, outline, distinguish, compare and contrast,
state, suggest) and put the marks in the heading. Mark schemes read like real
ones: slashes for alternatives, "Accept:" lines, one mark per point. The
examiner note is specific to that question ("an answer that says 'active
transport moves glucose in' scores one mark at most, because the question asks
for the chain"), never generic advice.

### `traps.md`

`# {{CODE}} {{TITLE}} — where the marks go`, then 4 to 8 entries. The three
labels are parsed by code and must be copied exactly, curly apostrophe
included:

```
## <the mistake, as a heading>

**Commonly written:** <the near-miss answer students actually write.>

**Why it doesn’t score:** <the specific thing the mark scheme wanted.>

**Scores instead:** <a sentence he could write in the exam.>
```

The app turns these into questions: it shows "Commonly written" and asks why
it fails, with the other entries' "Why it doesn't score" as the wrong options.
So make each "Why it doesn't score" specific to its own mistake, and keep them
all a similar length.

### `README.md`

```
# {{CODE}} {{TITLE}}

- **Theme:** {{THEME_LINE}}
- **Level:** {{LEVEL}}
- **Level of study:** {{STUDY}}
- **Status:** ready

## The one-sentence version

<What the topic is about, in one sentence he could say to a friend.>

## Why this topic is worth getting right

<Specific to this topic. If it's hard, say why and what to do differently.>

## In your study guide

Allott, _Biology Study Guide_ (2023), **{{GUIDE_SECTION}}**. Read it *after*
the capture sheet, never before. It's condensed enough to make a fast check of
what you left out, and a slow way to meet the topic for the first time.

## What's in this pack

| File | What it is |
| --- | --- |
| `essentials.md` | What you need to be able to do, in plain English |
| `videos.md` | What to watch, and what to watch *for* |
| `cards.json` | Retrieval questions for the flashcards |
| `exam.md` | Exam-style questions with real mark schemes |
| `traps.md` | Where marks get lost on this topic |
| `mcq.json` | Multiple-choice questions for the quiz in the app |
```

The app shows the sentence under `## The one-sentence version` as the topic's
subtitle, so keep that heading exactly.

{{/pack}}### `mcq.json`

```
{ "topic": "{{CODE}}",
  "questions": [
    { "id": "{{CODE}}-q01",
      "stem": "Which bonds hold a protein's secondary structure together?",
      "options": [
        { "text": "Hydrogen bonds between backbone amine and carboxyl groups",
          "correct": true,
          "why": "The alpha helix and beta pleated sheet are the backbone folding on itself, so the R groups aren't involved yet." },
        { "text": "Ionic bonds between oppositely charged R groups",
          "correct": false,
          "why": "That's tertiary structure. R-group bonds shape the whole chain, not the helix." },
        { "text": "Disulfide bonds between pairs of cysteine R groups",
          "correct": false,
          "why": "Disulfide bonds are also R-group interactions, so they belong to tertiary structure." },
        { "text": "Hydrophobic interactions between non-polar R groups",
          "correct": false,
          "why": "Those help fold the whole chain in tertiary structure, not the helix or sheet." } ] } ] }
```

How the app uses it: options are shuffled. If he picks right, it shows
"Correct." and that option's `why`. If he picks wrong, it shows "Not this one."
and the `why` of the option he picked, then the right answer and its `why`.
So:

- **{{QUIZ_COUNT}}**, each with **exactly four options, one correct, and a
  `why` on every option.**
- **A wrong option's `why` says why *that* option fails**, and names what it
  actually describes when it's a real thing in the wrong place ("That's
  tertiary structure"). Don't start with "No", "Wrong" or "Incorrect", and
  don't start a correct `why` with "Correct" or "Right"; the app already says
  so.
- **Distractors are real misconceptions**, ideally the ones in `traps.md`.
  Every distractor must be clearly wrong by the content, not arguably right.
- **No length tell.** Match the distractors to the correct option in length and
  detail. Across the file, the correct option should be the longest in about
  one question in four, no more.
- **No "all of the above" or "none of the above"**, since the order is shuffled.
- Stems ask one thing. Mix recall ("Where does glycolysis happen?"),
  explanation ("Why is pyruvate converted to lactate?") and application ("A
  polypeptide is 150 amino acids long...").
- Options in exam register; every `why` in the plain voice above, one or two
  sentences.

## Before you answer, check

{{#pack}}- Every Core and Higher level item in `essentials.md` has at least one card.
- Card ids and quiz ids run from 01 with no gaps{{#rebuild}}, and every id under **Ids already in use** is still there, on the same idea{{/rebuild}}.
- Every link is a YouTube search URL or copied exactly from **Verified links**.
- The three `traps.md` labels are exact, and `exam.md` has a `### Mark scheme` under every question.
{{/pack}}{{#quiz}}- Every question tests something stated in the **Source material**.
- Quiz ids run from q01 with no gaps{{EXISTING_QUIZ_CHECK}}.
{{/quiz}}- In `mcq.json`, count the questions where the correct option is the longest.
  If it's more than about a quarter, rewrite some distractors.
- Search your reply for "is not", "does not", "are not", "it is", "that is":
  most should be contractions. Search for "simply" and "just": there should be
  none.
- Anything you weren't sure of is under `UNCERTAIN`.

## This topic

{{TOPIC_FACTS}}

{{LINKS}}{{EXISTING}}{{EXAMPLE}}
