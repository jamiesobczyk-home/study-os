# For the parent

The short version: your job is the packs and the pace, not the studying. Build
topic packs ahead of him, keep the sessions short, and stay out of the marking.

## What this is

A study system that takes the thing he already does well — learning from video
— and adds the step that makes it stick. He watches, then closes the laptop and
tries to reproduce it, then gets tested on it at increasing intervals.

It is built around retrieval practice and spaced repetition, which are about
the two most consistently supported findings in the whole of learning research.
Nothing here is exotic. The system exists because these methods feel worse than
re-reading and so nobody does them without scaffolding.

## What you actually do

**Build the packs.** This is the real work, and it is yours. A topic pack is
five files: what he needs to be able to do, what to watch, the recall cards,
exam questions with mark schemes, and the common traps. Three are built as
worked examples. The other 37 are not.

You do not have to write them by hand. From a Claude session in this repo:

> build out the D1.1 topic pack

`.claude/skills/topic-pack/SKILL.md` tells Claude what a good pack looks like,
so the output is consistent rather than whatever that session felt like doing.

**Then check it against his Allott study guide before he studies from it.**
`study watch <topic>` prints the exact page range, so there is no hunting. A
confidently wrong card gets memorised exactly as efficiently as a correct one,
and he will not find out until an exam. The study guide is well suited to this:
it is condensed and organised by the same topic codes, so verifying a pack's
15 cards against its section is a ten-minute job, not an evening. If a card
disagrees with the book, the book wins.

**Stay a little ahead.** Build the pack for what his class is covering this
week, not the whole syllabus in one weekend. The system is only useful if the
pack exists when he needs it.

**Protect the cadence.** Twenty-five minutes, four or five days a week, beats
three hours on Sunday — not marginally, but by a lot. If you enforce one thing,
enforce that.

## What you should not do

**Do not mark his cards.** Self-grading is part of the mechanism: judging
whether he actually knew something is itself a retrieval act, and it is how he
learns to tell real knowledge from the feeling of familiarity. If you grade for
him, he never builds that.

**Do not ask "did you study today?"** Run `study progress` instead. It shows
the whole syllabus, how much of each topic he has attempted, and how solid the
recall is. You will know without asking, and he will know you can see it —
which turns out to be enough.

**Do not treat missed cards as a bad sign.** A session with eight misses did
more work than a session with none. Misses are the system finding the gaps. If
you react to them, he will start grading himself generously, and the whole
thing quietly stops functioning.

## Reading the progress view

    node tools/study.mjs progress

Bars show **recall strength** — how far cards have climbed through the review
intervals — not how much he has read. A topic can be fully read and show an
empty bar, and that is the point: it is measuring what he can produce.

Watch for a topic whose bar keeps resetting. That means cards are being missed
repeatedly, which usually means the underlying idea never landed, not that he
is not trying. That is the moment to get a teacher involved, and you will see
it weeks before a test would have told you.

## Where this could go wrong

**The packs do not get built.** Most likely failure by far. The system does
nothing without them, and building them is the part that needs an adult.

**Cards get graded generously.** If everything is marked "got it", the
intervals stretch, nothing comes back, and it turns into a system that
congratulates him. If you suspect this, ask him to say an answer out loud
before he reveals it — that is where it shows.

**Content drifts from his actual course.** The topic list here follows the
published syllabus, but what his teacher examines and when is the thing that
matters. Check a new pack against the study guide and his course outline before
he starts learning from it.

**It becomes another chore with a progress bar.** If it stops being used for
three weeks, do not rebuild it — ask him what part of it he hated. The method
is sound; the interface is negotiable.

## First week

1. Read `docs/method.md` yourself, then have him read it. It explains why the
   uncomfortable step is the one that works, and that matters more than any of
   the mechanics.
2. Sit with him for one full loop on A1.1 — watch, capture, quiz, exam. Once.
   After that it is his.
3. Build the pack for whatever his class is on right now.
4. Leave it alone for a fortnight, then look at `study progress`.
