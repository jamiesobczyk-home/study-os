# Adding another course

The system is not Biology-specific. Biology HL is just the first course in it.
Adding Chemistry, Maths AA, History or anything else takes one directory and
one JSON file.

## Steps

**1. Make the directory.**

    mkdir -p courses/chem-hl/topics

**2. Write `courses/chem-hl/course.json`.** Copy `courses/bio-hl/course.json`
and edit it. The fields that matter are `id`, `title`, and `assessment` — the
assessment list is what reminds him which paper a topic is likely to appear in
and where the marks actually are.

**3. Write `courses/chem-hl/syllabus.json`.** One entry per topic:

```json
{
  "code": "S1.1",
  "title": "Introduction to the particulate nature of matter",
  "theme": "S",
  "themeTitle": "Structure",
  "level": 1,
  "levelTitle": "Models of the particulate nature of matter",
  "hlOnly": false,
  "dir": "S1.1-particulate-nature-of-matter",
  "status": "not-started"
}
```

`code` and `dir` are the only fields the tools require. `dir` must match the
directory name under `topics/`, and `study new <code>` creates
it for you from the template.

For a course without themes and levels — most of them — set `theme` to a unit
number or name and leave `level` at 1. The grouping is only used for headings.

**4. Build a topic pack.**

    ./study new S1.1 --course chem-hl

**5. Use it.**

    ./study today --course chem-hl

Progress is stored per course in `progress/<course>.progress.json`, so courses
never interfere with each other.

## Getting the syllabus right

Do not hand-type forty topic codes. Two better options:

- Ask Claude in this repo: *"add Chemistry HL as a course — here is the topic
  list from the course outline"*, and paste it.
- Write a small generator like the one used for Biology and delete it after.

Either way, **check the result against the school's own course outline.** A
syllabus map that is subtly wrong is worse than none, because it will look
authoritative while he studies the wrong things.

## Does the method transfer?

Retrieval practice and spaced repetition work across subjects — this is one of
the better-replicated findings in the field. But the *shape* of a good card
changes:

- **Chemistry, Physics** — cards should mostly be problems to work, not
  definitions to recite. Put the working in the answer.
- **Maths** — the exam questions matter far more than the cards. Consider a
  pack that is mostly `exam.md`.
- **History, Economics** — cards for dates, definitions and named examples;
  `exam.md` for the essay structures, which is where the marks actually live.
- **Languages** — vocabulary works well with these intervals. Grammar needs
  production, so write cards that ask for a sentence, not a translation.

The framework does not care. Change what you put in the cards.
