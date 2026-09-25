#!/usr/bin/env python3
"""Scan text for pattern-matchable signs of AI writing.

Sign numbers match references/signs.md. This finds candidates, not verdicts:
a hit in a quotation, a proper noun or a literal use is fine to keep.
Judgement signs (2.5 rule of three, 2.6 elegant variation, 3.6 small tables)
are not scanned; read for those yourself.

Usage:
    python3 check_ai_signs.py FILE [FILE ...]      # .txt, .md, .html; "-" reads stdin
    python3 check_ai_signs.py FILE --summary       # counts per sign only

Standard library only.
"""
import argparse
import html
import re
import sys
from collections import OrderedDict

SIGN_NAMES = OrderedDict([
    ("1.1", "Undue significance / legacy"),
    ("1.2", "Canned notability"),
    ("1.3", "Superficial -ing analysis"),
    ("1.4", "Promotional tone"),
    ("1.5", "Vague attribution"),
    ("1.6", "Challenges formula"),
    ("1.7", "Title-defining lead"),
    ("1.8", "'X and Y' heading"),
    ("2.1", "AI vocabulary"),
    ("2.2", "Copula avoidance"),
    ("2.3", "Vague association"),
    ("2.4", "Negative parallelism"),
    ("3.1", "Title Case heading"),
    ("3.2", "Heavy boldface"),
    ("3.3", "Bold-label bullet"),
    ("3.4", "Em dash"),
    ("3.5", "Emoji as formatting"),
    ("3.7", "Mixed curly/straight quotes"),
    ("3.8", "Thematic break"),
    ("4.1", "Chat leftover"),
    ("4.2", "Knowledge-gap disclaimer"),
    ("4.3", "Placeholder"),
    ("5.1", "Didactic disclaimer"),
    ("5.2", "Summary opener"),
])


def words(*phrases):
    """Build one case-insensitive regex of whole-word alternatives."""
    alts = sorted(set(phrases), key=len, reverse=True)
    return re.compile(r"(?<![\w-])(?:" + "|".join(alts) + r")(?![\w-])", re.I)


SENTENCE_PATTERNS = {
    "1.1": words(
        r"stands? as", r"serves? as a (?:testament|reminder)", r"(?:is|was|remains) a testament",
        r"testament to", r"a (?:crucial|pivotal|vital|significant|key) (?:role|moment)",
        r"(?:underscores?|highlights?) (?:its|the|their) (?:importance|significance)",
        r"reflects? (?:a )?broader", r"(?:ongoing|enduring|lasting) (?:legacy|impact|significance)",
        r"setting the stage for", r"marking (?:a|the)", r"shaping the",
        r"(?:represents?|marks?) a (?:shift|turning point)", r"key turning point",
        r"evolving landscape", r"focal point", r"indelible mark", r"deeply rooted",
        r"generated debate about", r"broader reflection on",
    ),
    "1.2": words(
        r"independent coverage", r"(?:local|national|regional) media outlets?",
        r"trade publications?", r"(?:cited|featured|profiled) in",
        r"written by a leading expert", r"active social media presence",
    ),
    "1.3": re.compile(
        r",\s+(?:highlighting|underscoring|emphasi[sz]ing|ensuring|reflecting|symboli[sz]ing|"
        r"contributing to|cultivating|fostering|encompassing|enhancing|showcasing)\b"
        r"|\bvaluable insights?\b|\b(?:aligns?|resonates?) with\b", re.I),
    "1.4": words(
        r"boasts? an?", r"vibrant", r"rich (?:culture|cultural|heritage|history)", r"profound",
        r"exemplif(?:y|ies)", r"commitment to", r"natural beauty", r"nestled",
        r"in the heart of", r"groundbreaking", r"renowned", r"diverse array", r"breathtaking",
        r"stunning", r"world-class", r"seamless(?:ly)?", r"state-of-the-art",
    ),
    "1.5": words(
        r"industry reports?", r"observers (?:have )?(?:cited|noted|note)", r"experts (?:argue|say|agree)",
        r"some critics (?:argue|say)", r"several sources", r"studies (?:show|suggest)",
        r"widely regarded", r"it is widely (?:believed|accepted)",
    ),
    "1.6": re.compile(
        r"\bdespite (?:its|their|these|this|the)\b.*\b(?:challenges?|thrive|continues? to)\b"
        r"|\bfaces? (?:several|a number of|significant|numerous) challenges\b", re.I),
    "1.7": re.compile(r"^\s*(?:the )?[\w ,'-]{1,60}\b(?:refers to|is a curated (?:list|compilation))\b", re.I),
    "2.1": words(
        r"additionally", r"bolstered", r"crucial", r"delv(?:e|es|ed|ing)", r"emphasi[sz]ing",
        r"enduring", r"garner(?:s|ed)?", r"intricate", r"intricacies", r"interplay",
        r"landscape", r"meticulous(?:ly)?", r"pivotal", r"underscores?", r"underscored",
        r"tapestry", r"testament", r"valuable", r"vibrant", r"align with", r"enhanc(?:e|es|ed|ing)",
        r"foster(?:s|ed|ing)?", r"highlighting", r"showcas(?:e|es|ed|ing)", r"robust",
        r"key (?:role|factor|aspect|component|element|feature|takeaway|takeaways|insight|insights|player|players|part|point|area|areas|driver|pillar|theme)",
    ),
    "2.2": words(
        r"serves? as", r"served as", r"stands? as", r"functions? as", r"operates? as",
        r"ventured into", r"began (?:his|her|their) career as",
    ),
    "2.3": words(r"(?:was |is |were )?associated with", r"in connection with"),
    "2.4": re.compile(
        r"\bnot only\b.*\bbut(?: also)?\b"
        r"|\b(?:it's|it is|this is|that's|that is)\s+not\s+(?:just|only|merely|simply|about)?\b[^.;]{0,60}[,;—–-]\s*(?:it's|it is|but)\b"
        r"|\bisn't\s+(?:just|only|merely)?\b[^.;]{0,60}[,;—–-]\s*(?:it's|it is)\b"
        r"|\bno \w+(?: \w+)?, no \w+(?: \w+)?,? (?:just|only)\b"
        r"|\brather than\b", re.I),
    "4.1": words(
        r"I hope this helps", r"certainly!", r"great question", r"let me know if",
        r"would you like me to",
        r"here(?: is|'s) (?:an?|the|your) (?:revised|rewritten|updated|improved|polished|quick|brief|short|summary|breakdown|draft|version|list|overview)", r"in this (?:section|article|post),? we will",
        r"feel free to",
    ),
    "4.2": words(
        r"as of my (?:last|latest) (?:update|knowledge)", r"specific details (?:are|about)",
        r"not widely (?:documented|disclosed|reported|known)", r"based on (?:the )?available information",
        r"maintains a low profile", r"details are limited", r"information is limited",
    ),
    "5.1": words(
        r"it(?:'s| is) important to (?:note|remember|consider)", r"it is worth noting",
        r"it's worth noting", r"(?:may|might|can) vary", r"keep in mind",
    ),
}

SENTENCE_START_PATTERNS = {
    "5.2": re.compile(r"^\s*(?:in summary|in conclusion|overall|ultimately|to sum up)\b", re.I),
}

PLACEHOLDER = re.compile(
    r"\[(?:your|insert|describe|add|company|name|date|link|url)[^\]]*\]|INSERT_[A-Z_]+|\b\d{4}-XX-XX\b", re.I)
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF⭐⭕]")
MINOR = {"a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet", "of", "in", "on",
         "at", "to", "by", "up", "as", "is", "vs", "with", "from", "into", "via"}


def strip_html(text):
    text = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", text)
    text = re.sub(r"(?i)<h([1-6])[^>]*>", lambda m: "\n" + "#" * int(m.group(1)) + " ", text)
    text = re.sub(r"(?i)</h[1-6]>", "\n", text)
    text = re.sub(r"(?i)<(?:strong|b)>", "**", text)
    text = re.sub(r"(?i)</(?:strong|b)>", "**", text)
    text = re.sub(r"(?i)<li[^>]*>", "\n- ", text)
    text = re.sub(r"(?i)<hr\s*/?>", "\n---\n", text)
    text = re.sub(r"(?i)<(?:br|/p|p|/div|div)[^>]*>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text)


def strip_code(text):
    """Blank out front matter and code so they are never flagged, keeping line numbers."""
    text = re.sub(r"\A---\n.*?\n---\n", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    text = re.sub(r"(?ms)^(```|~~~).*?^\1", lambda m: "\n" * m.group(0).count("\n"), text)
    return re.sub(r"`[^`\n]+`", "", text)


def is_title_case(heading):
    toks = re.findall(r"[A-Za-z][A-Za-z'’-]*", heading)
    content = [t for i, t in enumerate(toks) if i == 0 or t.lower() not in MINOR]
    if len(content) < 3:
        return False
    capped = [t for t in content[1:] if t[0].isupper() and not t.isupper()]
    return len(capped) >= max(2, len(content[1:]) * 0.8)


def split_sentences(line):
    parts = re.split(r"(?<=[.!?])\s+(?=[\"'“‘(\[]?[A-Z0-9])", line)
    return [p.strip() for p in parts if p.strip()]


def scan(text):
    hits = []  # (sign, line_no, snippet)
    lines = text.split("\n")
    bold_total = 0
    breaks = []
    has_curly = has_straight = False
    for no, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line:
            continue
        heading = re.match(r"^#{1,6}\s+(.*)$", line)
        body = heading.group(1) if heading else line
        if heading:
            if is_title_case(body):
                hits.append(("3.1", no, body))
            if re.search(r"\b\w+ (?:and|&) \w+\s*$", body) and len(body.split()) <= 5:
                hits.append(("1.8", no, body))
        if re.fullmatch(r"(?:-{3,}|\*{3,}|_{3,})", line):
            breaks.append(no)
            continue
        if re.match(r"^(?:[-*+]|\d+[.)])\s+\*\*[^*]+:\*\*|^(?:[-*+]|\d+[.)])\s+\*\*[^*]+\*\*:", line):
            hits.append(("3.3", no, line))
        bold_total += len(re.findall(r"\*\*[^*]+\*\*", line))
        if EMOJI.search(line[:3]) or (heading and EMOJI.search(body[:3])):
            hits.append(("3.5", no, line))
        if "—" in line:
            hits.append(("3.4", no, line))
        if re.search(r"[“”‘’]", line):
            has_curly = True
        if re.search(r"[A-Za-z]'[A-Za-z]|\"", line):
            has_straight = True
        if PLACEHOLDER.search(line):
            hits.append(("4.3", no, line))
        plain = re.sub(r"[*_#>]+", "", body).strip()
        for sent in split_sentences(plain):
            for sign, pat in SENTENCE_PATTERNS.items():
                if pat.search(sent):
                    hits.append((sign, no, sent))
            for sign, pat in SENTENCE_START_PATTERNS.items():
                if pat.search(sent):
                    hits.append((sign, no, sent))
    if bold_total >= 5:
        hits.append(("3.2", 0, f"{bold_total} bold spans in the text"))
    if len(breaks) >= 2:
        hits.append(("3.8", breaks[0], f"{len(breaks)} thematic breaks (lines {', '.join(map(str, breaks))})"))
    if has_curly and has_straight:
        hits.append(("3.7", 0, "text mixes curly and straight quotes/apostrophes"))
    order = list(SIGN_NAMES)
    hits.sort(key=lambda h: (order.index(h[0]), h[1]))
    return hits


def load(path):
    if path == "-":
        return sys.stdin.read(), "<stdin>"
    with open(path, encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    if path.lower().endswith((".html", ".htm")):
        text = strip_html(text)
    return text, path


def main(argv=None):
    ap = argparse.ArgumentParser(description="Scan text for signs of AI writing.")
    ap.add_argument("files", nargs="+", help='files to scan (.txt, .md, .html); "-" for stdin')
    ap.add_argument("--summary", action="store_true", help="print counts per sign only")
    args = ap.parse_args(argv)

    grand = 0
    for path in args.files:
        try:
            text, label = load(path)
        except OSError as err:
            print(f"{path}: {err}", file=sys.stderr)
            continue
        hits = scan(strip_code(text))
        grand += len(hits)
        print(f"== {label}: {len(hits)} hit(s)")
        if not hits:
            continue
        counts = OrderedDict()
        for sign, _, _ in hits:
            counts[sign] = counts.get(sign, 0) + 1
        if args.summary:
            for sign, n in counts.items():
                print(f"  {sign:<4} {SIGN_NAMES[sign]:<30} {n}")
            continue
        current = None
        for sign, no, snippet in hits:
            if sign != current:
                print(f"\n  [{sign}] {SIGN_NAMES[sign]}")
                current = sign
            where = f"L{no}" if no else "--"
            snip = snippet if len(snippet) <= 160 else snippet[:157] + "..."
            print(f"    {where:>5}  {snip}")
        print()
    if len(args.files) > 1:
        print(f"== total: {grand} hit(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
