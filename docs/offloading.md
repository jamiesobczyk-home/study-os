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

Three steps, run from the `study-os` folder in PowerShell (`.\study` on
Windows, `./study` elsewhere).

**1. Put the prompt on the clipboard.**

    .\study prompt D1.1 --example --copy

That fills in the topic, theme, level, HL flag, study-guide pages and the
verified channel links, so there's nothing to edit. `--example` appends a
finished pack for the model to match. It makes the prompt long, but showing a
model the standard works better than describing it. Pick which pack with
`--example C1.2`.

There are three kinds of prompt:

| Command | Use it for | What the model writes |
| --- | --- | --- |
| `.\study prompt D1.1` | a topic with no pack yet | all seven files |
| `.\study prompt B1.2 --rebuild` | redoing a pack he's already used | all seven files, keeping every card and quiz id on its idea |
| `.\study prompt B1.2 --quiz` | adding quiz questions to a pack | `mcq.json` only, written from the pack's own checked content |

Use `--rebuild`, never a plain prompt, for a topic that already exists. His
progress lives in his browser and is keyed on those ids, and the rebuild
prompt is the only thing that tells the model what they are. `--quiz` is the
safest way to get more questions: the model writes from content you've
already checked against the book, not from memory.

**2. Paste it into ChatGPT, then copy the whole reply** with the copy button
under the answer.

**3. Import it.**

    .\study import D1.1                    # a new topic
    .\study import B1.2 --replace          # a rebuild
    .\study import B1.2 --quiz --replace   # quiz questions, if it has some already

With no file named, it reads the clipboard. Don't pipe text in or out with
`Get-Clipboard` or `Set-Clipboard`: Windows PowerShell 5 turns curly
apostrophes into `?` on the way through a pipe, which is why `--copy` and the
importer talk to the clipboard themselves. The importer refuses a reply that's
been through that damage. If the clipboard doesn't work,
paste the reply into Notepad, save it as `reply.txt`, and run
`.\study import D1.1 reply.txt`.

Before it writes anything, it checks that:

- every file is for the topic you named (a B2.1 reply can't land in B1.2);
- a rebuild keeps every existing card and quiz id, and it shows you each
  reworded question beside the old one so you can see that the idea didn't
  move;
- the quiz questions have four options, one right answer, an explanation on
  every option, and no length giveaway;
- the whole pack passes `study check`. If it doesn't, every file goes back to
  how it was.

Then it rebuilds `index.html` and prints the model's `UNCERTAIN` list with the
study-guide pages to check it against. It never commits.

**4. Check the biology against the study guide.** Read the `UNCERTAIN` list
first, then the section. About ten minutes. Then `.\study links D1.1`, and
commit when you're happy.

Steps 1 to 3 are offloadable. Step 4 isn't, and it's the one that matters.

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
