# Offloading pack generation

You can generate topic packs anywhere — ChatGPT, another Claude session, a
local model. `prompts/topic-pack.md` is self-contained for exactly this: it
carries the whole format contract, so output drops in without editing.

Read this first, though, because the obvious plan is the wrong one.

## The bottleneck is not generation

Generating 37 packs is easy. Any capable model will produce plausible IB
Biology content all day.

**Verifying them is the work**, and it does not parallelize by adding another
generator. A second model producing packs creates more to check, not less. The
question to ask about any offloading plan is not "can it write the pack" but
"does it reduce the minutes I spend with the book open".

So: generate wherever is convenient. Just do not mistake a folder full of
generated packs for progress. A pack is done when it has been checked.

## The two failure modes

**Confident wrong content.** The real risk. A wrong card is memorized exactly
as efficiently as a correct one, and he finds out in an exam. Models are
fluent about IB Biology and fluency is not accuracy.

*Mitigation:* the study guide. It is condensed and organized by topic code, so
checking a pack's 15 cards against its section is a ten-minute job. Where a
card disagrees with the book, the book wins. The prompt also asks the model to
end with an `UNCERTAIN` list — read that first, it is where the checking time
pays best.

**Drift.** Two models, or the same model on different days, phrase the same
biology differently, structure exam questions differently, and slowly stop
matching. Over 37 packs and two years that turns a system into a pile of files.

*Mitigation:* always use `study prompt` rather than asking freehand, and always
run the checker.

## The workflow

1. Print a paste-ready prompt and copy it:

       study prompt B1.2

   That fills in the topic, theme, level, HL flag and study-guide pages from
   the syllabus, so there is nothing to edit. Add `--example` to append a
   finished pack as a worked example — worth it the first few times, because
   showing a model the standard works better than describing it:

       study prompt B1.2 --example
       study prompt B1.2 --example C1.2   # pick which one
2. Paste it in. Save the six returned files into `courses/bio-hl/topics/<CODE>-<slug>/`.
   `study new <CODE>` creates the directory first if you want it
   scaffolded.
3. Run the structural check:

       study check <CODE>

   It verifies card ids are sequential, `exam.md` will actually parse, no
   template placeholders survived, no invented video URLs, and the counts are
   in range. Errors mean the pack will not work; warnings are usually worth
   fixing. It exits non-zero on errors, so you can gate on it.

4. **Check the biology against the study guide.** Read the `UNCERTAIN` list,
   then the section. Ten minutes.
5. Set `studyGuidePages` for the topic in `courses/bio-hl/syllabus.json`.

Steps 1–3 are offloadable. Step 4 is not, and it is the one that matters.

## What each tool is actually best at

**ChatGPT or another model, given the portable prompt.** Bulk pack generation.
Genuinely good at it, and it costs you nothing here. This is the right thing to
offload.

**A Claude session in this repo.** Anything needing the repo — following
`.claude/skills/topic-pack/SKILL.md`, reading neighbouring packs for
consistency, fixing what the checker flags, adding a course. Better than a
context-free session because it can see what the other packs look like.

**You, with the book.** Verification, and `studyGuidePages`. Nothing else can
do either.

**Him.** Nothing. He should never be asked to build the thing he is supposed to
be studying from — building a pack is a great way to feel productive without
doing any retrieval.

## A realistic plan

Do not generate 37 packs this weekend. Most will be wrong in small ways, you
will not check them, and he will study from unverified material.

Generate two or three at a time, a week ahead of his class. Check them against
the book while the topic is what he is actually being taught, which is also
when you are most likely to spot something off. The system only needs the pack
to exist by the time he needs it.

Verification is already cheaper than it looks: all 40 page ranges are recorded,
so `study watch <topic>` tells you exactly which pages to read. Checking a
pack against its section is genuinely a ten-minute job.
