"""Link HUTBA glossary terms and rebuild lesson backlinks.

Python 3.9+ and PyYAML (pip install PyYAML).
Preview: python glossary_linker.py --dry-run
Apply:   python glossary_linker.py --write
The project root can be set with --project-root. No changes are written by default.
Only text rendered as HTML/Markdown is processed, never SEO metadata or media URLs.
"""

import argparse
import html
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import yaml

PROJECT_ROOT = Path(r"D:\Yandex.Disk\AstroProject")
EXCLUDED_TERMS = {"аллах", "аят", "коран", "хадис", "сура", "имам"}
URL_PREFIX = "/glossary"
LINK_CLASS = "glossary-link"

# Protect links (including reference links/images), code, HTML attributes,
# headings, script/style/pre/code contents, comments and project shortcodes.
# HTML tags remain intact; only their text nodes can acquire links.
TAG = r'''<[^>"']*(?:"[^"]*"[^>"']*|'[^']*'[^>"']*)*>'''
PROTECTED = re.compile(
    r"(?m:^[ \t]{0,3}(?P<fence>`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?"
    r"^[ \t]{0,3}(?P=fence)[ \t]*(?:\r?\n|$))"
    r"|(?m:^(?: {4}|\t)[^\r\n]*(?:\r?\n|$))"
    r"|(?P<ticks>`+)[\s\S]*?(?P=ticks)(?!`)"
    r"|<!--[\s\S]*?-->"
    r"|<(?:a|script|style|pre|code|h[1-6])\b[^>]*>[\s\S]*?</(?:a|script|style|pre|code|h[1-6])\s*>"
    r"|!?\[(?:[^\[\]]|\[[^\]]*\])*\]\((?:[^()\n]|\([^()\n]*\))*\)"
    r"|(?m:^[ \t]{0,3}\[[^\]\n]+\]:[^\r\n]*(?:\r?\n|$))"
    r"|!?\[[^\]\n]+\](?:[ \t]*\[[^\]\n]*\])?"
    r"|(?m:^[ \t]{0,3}#{1,6}[ \t][^\r\n]*(?:\r?\n|$))"
    r"|\{(?P<shortcode>Quran|Dic)\}[\s\S]*?\{/(?P=shortcode)\}"
    r"|(?:https?://|www\.)[^\s<>]+"
    r"|&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);"
    r"|" + TAG,
    re.IGNORECASE,
)
FRONTMATTER = re.compile(r"\A\ufeff?---[ \t]*\r?\n(?P<yaml>[\s\S]*?)^---[ \t]*(?:\r?\n|$)", re.M)
HREF = re.compile(r'''\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))''', re.I)
MD_LINK = re.compile(r"\[[^\]]*\]\(<?([^\s)>]+)")


def ambiguous_context(slug, before, after):
    """Avoid known homonyms: the letter ayn is not the evil eye definition."""
    before = re.sub(r"[*_]+", "", re.sub(TAG, "", before))
    after = re.sub(r"[*_]+", "", re.sub(TAG, "", after))
    if slug == "ajn":
        return not re.search(r"сглаз|дурн\w*\s+глаз", before[-200:] + after[:200], re.I)
    if slug in {"khalil", "khasan"}:
        return bool(re.search(r"(?:ибн|имам|шейх)\s+(?:аль-)?[«\"']?$", before[-40:], re.I)
                    or re.match(r"^[»\"'\s]*ибн\b", after, re.I))
    if slug == "din":
        return bool(re.search(r"(?:ад|уд|аль)-$", before, re.I))
    return False


def read_text(path):
    with path.open(encoding="utf-8", newline="") as stream:
        return stream.read()


def encode_component(value):
    """Use the same URL encoding as encodeURIComponent in the Astro routes."""
    return quote(str(value), safe="-_.!~*'()")


def split_frontmatter(text):
    match = FRONTMATTER.match(text)
    if not match:
        return "", {}, text
    return text[:match.end()], yaml.safe_load(match.group("yaml")) or {}, text[match.end():]


def replace_yaml_list(text, name, values):
    """Change one top-level list without reserializing titles/descriptions/body."""
    match = FRONTMATTER.match(text)
    if not match:
        raise ValueError("Missing glossary frontmatter")
    newline = "\r\n" if "\r\n" in match.group(0) else "\n"
    front = match.group("yaml")
    replacement = f"{name}: []{newline}" if not values else (
        f"{name}:{newline}" + "".join(
            f"  - {json.dumps(value, ensure_ascii=False)}{newline}" for value in values
        )
    )
    # YAML indentless lists are allowed, so the next field, rather than the
    # indentation of list items, delimits the replacement.
    pattern = re.compile(rf"^{re.escape(name)}:[^\r\n]*(?:\r?\n|$)[\s\S]*?(?=^[^\s#\-][^\r\n]*:|\Z)", re.M)
    if pattern.search(front):
        front = pattern.sub(lambda _: replacement, front, count=1)
    else:
        front += replacement
    return text[:match.start("yaml")] + front + text[match.end("yaml"):]


def glossary_slug(url):
    parsed = urlsplit(html.unescape(url))
    if parsed.netloc and parsed.netloc.lower() not in {"hutba.org", "www.hutba.org"}:
        return None
    path = unquote(parsed.path).rstrip("/")
    return path[len(URL_PREFIX) + 1:] if path.startswith(URL_PREFIX + "/") else None


def existing_terms(text, valid_slugs):
    # Restrict detection to actual links, outside code and other protected text.
    found = set()
    for token in PROTECTED.finditer(text):
        raw = token.group(0)
        if re.match(r"<a\b", raw, re.I):
            opening = re.match(TAG, raw)
            href = HREF.search(opening.group(0)) if opening else None
            urls = [next(value for value in href.groups() if value is not None)] if href else []
        elif raw.startswith("[") and "](" in raw:
            urls = [m.group(1) for m in MD_LINK.finditer(raw)]
        else:
            continue
        found.update(slug for url in urls if (slug := glossary_slug(url)) in valid_slugs)
    # Reference-style Markdown links need both a definition and a usage.
    clean = PROTECTED.sub(lambda m: m.group(0) if m.group(0).lstrip().startswith("[") else "", text)
    definitions = re.finditer(r"(?m)^[ \t]{0,3}\[([^\]]+)\]:[ \t]*<?([^\s>]+)", clean)
    for definition in definitions:
        label, url = definition.groups()
        if re.search(rf"\[[^\]\n]+\]\s*\[{re.escape(label)}\]|\[{re.escape(label)}\](?!:)", clean, re.I):
            slug = glossary_slug(url)
            if slug in valid_slugs:
                found.add(slug)
    return found


class Linker:
    def __init__(self, entries):
        self.slugs = {entry["url_slug"] for entry in entries}
        candidates = defaultdict(set)
        for entry in entries:
            # Several glossary titles contain alternative spellings separated
            # by commas; aliases are supported as well. No guessed inflections.
            names = [entry["term"], *entry.get("aliases", [])]
            for name in names:
                for variant in re.split(r"[,;]", name):
                    variant = variant.strip().strip(". ")
                    if len(variant) < 2 or variant.casefold() in EXCLUDED_TERMS:
                        continue
                    candidates[variant.casefold()].add(entry["url_slug"])
        # Ambiguous spellings must not silently point to an arbitrary entry.
        self.ambiguous = {name: slugs for name, slugs in candidates.items() if len(slugs) > 1}
        self.index = {name: next(iter(slugs)) for name, slugs in candidates.items() if len(slugs) == 1}
        alternatives = sorted(self.index, key=lambda name: (-len(name), name))
        self.pattern = re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, alternatives)) + r")(?!\w)", re.I) if alternatives else None

    def link(self, text, used=None):
        used = set() if used is None else set(used)
        used.update(existing_terms(text, self.slugs))
        added = set()

        def replace(match):
            slug = self.index[match.group(0).casefold()]
            if slug in used or ambiguous_context(slug, text[max(0, match.start() - 200):match.start()], text[match.end():match.end() + 200]):
                return match.group(0)
            used.add(slug)
            added.add(slug)
            return (f'<a href="{URL_PREFIX}/{encode_component(slug)}" class="{LINK_CLASS}" '
                    f'target="_blank" rel="noopener noreferrer">{match.group(0)}</a>')

        def replace_range(start, end):
            if not self.pattern:
                return text[start:end]
            parts, cursor = [], start
            # Match positions belong to the whole text for context checks.
            for match in self.pattern.finditer(text, start, end):
                parts.extend([text[cursor:match.start()], replace(match)])
                cursor = match.end()
            parts.append(text[cursor:end])
            return "".join(parts)

        parts, start = [], 0
        for token in PROTECTED.finditer(text):
            parts.extend([replace_range(start, token.start()), token.group(0)])
            start = token.end()
        parts.append(replace_range(start, len(text)))
        return "".join(parts), added


@dataclass
class Document:
    path: Path
    original: str
    data: object = None
    prefix: str = ""
    body: str = ""
    changed: bool = False

    def render(self):
        if self.data is None:
            return self.prefix + self.body
        # Match the source indentation and newline style; the data outside the
        # whitelisted text fields is unchanged.
        indent_match = re.search(r"\r?\n([ \t]+)\S", self.original)
        indent = indent_match.group(1) if indent_match else 2
        rendered = json.dumps(self.data, ensure_ascii=False, indent=indent)
        if "\r\n" in self.original:
            rendered = rendered.replace("\n", "\r\n")
        return rendered + ("\r\n" if self.original.endswith("\r\n") else "\n" if self.original.endswith("\n") else "")


@dataclass
class Fragment:
    document: Document
    pointer: tuple = ()
    owners: set = field(default_factory=set)

    def get(self):
        value = self.document.data
        if value is None:
            return self.document.body
        for key in self.pointer:
            value = value[key]
        return value

    def set(self, text):
        self.document.changed = True
        if self.document.data is None:
            self.document.body = text
            return
        value = self.document.data
        for key in self.pointer[:-1]:
            value = value[key]
        value[self.pointer[-1]] = text


def inline_text_pointers(block, prefix):
    """Only fields that the current React renderer treats as HTML."""
    if block.get("type") != "pronunciation":
        return
    if isinstance(block.get("description"), str):
        yield (*prefix, "description")
    for name in ("points", "howTo"):
        for index, value in enumerate(block.get(name, [])):
            if isinstance(value, str):
                yield (*prefix, name, index)
    for index, note in enumerate(block.get("notes", [])):
        if isinstance(note.get("text"), str):
            yield (*prefix, "notes", index, "text")
        for item_index, value in enumerate(note.get("items", [])):
            if isinstance(value, str):
                yield (*prefix, "notes", index, "items", item_index)


def collect_fragments(root):
    lessons_root = root / "src/content/lessons"
    documents, fragments, lessons, warnings = {}, {}, {}, []

    def load(path, is_json=False):
        path = path.resolve()
        if path not in documents:
            original = read_text(path)
            if is_json:
                documents[path] = Document(path, original, data=json.loads(original))
            else:
                prefix, _, body = split_frontmatter(original)
                documents[path] = Document(path, original, prefix=prefix, body=body)
        return documents[path]

    def add(document, pointer, url):
        key = (document.path, pointer)
        if key not in fragments:
            fragments[key] = Fragment(document, pointer)
        fragments[key].owners.add(url)

    theory_files = sorted(lessons_root.glob("**/theory/*.md"))
    sharh_path = lessons_root / "quran/koran-2-uroven/sharh.json"
    mukaddima_path = lessons_root / "quran/koran-2-uroven/mukaddima.json"
    matn_numbers = {item["n"] for item in json.loads(read_text(mukaddima_path))} if mukaddima_path.exists() else set()
    for course_file in sorted((root / "src/content/courses").glob("**/*.yml")):
        course = yaml.safe_load(read_text(course_file))
        subject, course_slug = course["subject"], course["slug"]
        folder = lessons_root / subject / course_slug
        if course.get("type") != "interactive":
            for path in sorted(folder.glob("**/*.md")):
                if "theory" in path.relative_to(folder).parts:
                    continue
                document = load(path)
                _, metadata, _ = split_frontmatter(document.original)
                lesson_id = metadata.get("slug")
                if not lesson_id:
                    relative_id = path.relative_to(lessons_root).with_suffix("").as_posix()
                    # Astro's default GitHub slug lowercases path segments and
                    # changes spaces to hyphens. Reject unconventional filenames
                    # rather than inventing potentially invalid lesson URLs.
                    if not re.fullmatch(r"[a-zA-Z0-9_ /-]+", relative_id):
                        raise ValueError(f"Set an explicit frontmatter slug for this filename: {path}")
                    lesson_id = relative_id.lower().replace(" ", "-")
                    lesson_id = re.sub(r"/index$", "", lesson_id)
                url = f"/lesson?subject={encode_component(subject)}&course={encode_component(course_slug)}&slug={encode_component(lesson_id)}"
                lessons[url] = {"title": metadata.get("title", path.stem), "course": course["title"]}
                add(document, (), url)
            continue

        bundle = folder / "lessons.bundle.json"
        lesson_sources = [bundle] if bundle.exists() else sorted(folder.glob("**/*.json"))
        interactive = []
        for path in lesson_sources:
            document = load(path, True)
            records = enumerate(document.data) if path == bundle else [(None, document.data)]
            for index, lesson in records:
                if isinstance(lesson, dict) and isinstance(lesson.get("blocks"), list):
                    interactive.append((lesson, document, () if index is None else (index,)))
        seen_slugs = set()
        for lesson, document, prefix in sorted(interactive, key=lambda row: row[0]["id"]):
            slug = lesson["slug"]
            if slug in seen_slugs:
                warnings.append(f"Duplicate interactive slug, unreachable lesson skipped: {subject}/{course_slug}/{slug} (id={lesson['id']})")
                continue
            seen_slugs.add(slug)
            url = f"/{encode_component(subject)}/{encode_component(course_slug)}/?lesson={encode_component(slug)}"
            title = lesson["title"]
            if isinstance(title, list):
                title = "".join(part["text"] for part in title)
            lessons[url] = {"title": title, "course": course["title"]}
            for block_index, block in enumerate(lesson["blocks"]):
                for pointer in inline_text_pointers(block, (*prefix, "blocks", block_index)):
                    add(document, pointer, url)
                if block.get("type") == "theory":
                    source = block["source"].lstrip("/")
                    matches = [path for path in theory_files if path.as_posix().endswith(f"/theory/{source}") or path.as_posix().endswith(f"/{source}")]
                    local = folder / "theory" / source
                    path = local if local in matches else matches[0] if len(matches) == 1 else None
                    if path is None:
                        raise ValueError(f"Missing/ambiguous theory: {url}: {source}")
                    add(load(path), (), url)
                if block.get("type") == "matn":
                    if not sharh_path.exists():
                        raise ValueError(f"Missing shared matn commentary: {sharh_path}")
                    sharh = load(sharh_path, True)
                    for number in range(block["from"], block["to"] + 1):
                        key = str(number)
                        if number in matn_numbers and isinstance(sharh.data.get(key), str):
                            add(sharh, (key,), url)
    return documents, list(fragments.values()), lessons, warnings


def run(root, write=False, report_path=None):
    root = Path(root).resolve()
    glossary_files = sorted((root / "src/content/glossary").glob("*.md"))
    if not glossary_files:
        raise ValueError(f"Glossary not found in {root}")
    glossary = []
    for path in glossary_files:
        original = read_text(path)
        _, metadata, _ = split_frontmatter(original)
        glossary.append((path, original, metadata))
    linker = Linker([metadata for _, _, metadata in glossary])
    documents, fragments, lessons, warnings = collect_fragments(root)
    used_in, related, lesson_terms = defaultdict(set), defaultdict(set), defaultdict(set)
    # Seed the whole lesson before adding links, including all its shared blocks.
    for fragment in fragments:
        found = existing_terms(fragment.get(), linker.slugs)
        for url in fragment.owners:
            lesson_terms[url].update(found)
    added_count = 0
    for fragment in fragments:
        blocked = set().union(*(lesson_terms[url] for url in fragment.owners))
        linked, added = linker.link(fragment.get(), blocked)
        if added:
            fragment.set(linked)
            added_count += len(added)
            for url in fragment.owners:
                lesson_terms[url].update(added)
    for url, slugs in lesson_terms.items():
        for slug in slugs:
            used_in[slug].add(url)
            related[slug].update(slugs - {slug})

    changes = {}
    for document in documents.values():
        # Do not reformat untouched JSON documents.
        if document.changed:
            rendered = document.render()
            if rendered != document.original:
                changes[document.path] = rendered
    for path, original, metadata in glossary:
        slug = metadata["url_slug"]
        updated = original
        for name, values in (("used_in", sorted(used_in[slug])), ("related", sorted(related[slug]))):
            if metadata.get(name, []) != values:
                updated = replace_yaml_list(updated, name, values)
        if updated != original:
            changes[path] = updated
    if write:
        for path, updated in changes.items():
            with path.open("w", encoding="utf-8", newline="") as stream:
                stream.write(updated)
    report = {
        "mode": "write" if write else "dry-run", "project_root": str(root),
        "lessons": len(lessons), "interactive_lessons": sum(not url.startswith("/lesson?") for url in lessons),
        "new_links": added_count, "backlinks": sum(map(len, used_in.values())),
        "changed_files": [path.relative_to(root).as_posix() for path in sorted(changes)],
        "ambiguous_spellings": {name: sorted(slugs) for name, slugs in sorted(linker.ambiguous.items())},
        "warnings": warnings,
        "terms": {slug: [{"url": url, **lessons[url]} for url in sorted(urls)] for slug, urls in sorted(used_in.items()) if urls},
    }
    if report_path:
        report_path = Path(report_path)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{report['mode']}: lessons={len(lessons)}, new links={added_count}, backlinks={report['backlinks']}, changed files={len(changes)}")
    for warning in warnings:
        print(f"Warning: {warning}")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    local_root = Path(__file__).resolve().parent.parent
    default_root = local_root if (local_root / "src/content/glossary").exists() else PROJECT_ROOT
    parser.add_argument("--project-root", type=Path, default=default_root)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Apply links and rebuild glossary backlinks")
    mode.add_argument("--dry-run", action="store_true", help="Preview only (default)")
    parser.add_argument("--report", type=Path, help="Optional JSON report with exact lesson URLs")
    args = parser.parse_args()
    run(args.project_root, args.write, args.report)


if __name__ == "__main__":
    main()
