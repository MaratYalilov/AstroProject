"""Regression tests: python -m unittest discover -s scripts -p test_glossary_linker.py"""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

import glossary_linker as g


class LinkerTests(unittest.TestCase):
    def setUp(self):
        self.linker = g.Linker([
            {"term": "Акида, Акыда.", "url_slug": "akida", "aliases": ["вероубеждение"]},
            {"term": "Таджвид", "url_slug": "tadzhvid"},
            {"term": "Аллах", "url_slug": "allah"},
        ])

    def test_first_occurrence_and_alternative_spelling(self):
        result, added = self.linker.link("Акыда, акида, вероубеждение. Таджвид и таджвид. Аллах.")
        self.assertEqual(added, {"akida", "tadzhvid"})
        self.assertEqual(result.count('class="glossary-link"'), 2)
        self.assertIn('>Акыда</a>', result)
        self.assertIn("Аллах.", result)
        self.assertEqual(self.linker.link(result), (result, set()))

    def test_protected_markup(self):
        samples = [
            '```mermaid\ngraph TD; Акида-->Таджвид\n```\n',
            '~~~\nАкида\n~~~\n', '    Акида\n', '`Акида`', '``Акида ` Таджвид``',
            '<code>Акида</code>', '<pre>Акида</pre>', '<script>Акида</script>',
            '<!-- Акида -->', '<a href="/somewhere">Акида</a>',
            '<img alt="Акида" src="/Акида.png">',
            '[Акида](https://example.org/a_(b) "Таджвид")',
            '![Акида](/Акида.png)', '[Акида][course]', '[Акида]',
            '[course]: /Акида\n', '{Quran}Акида{/Quran}', '{Dic}Акида{/Dic}',
            '# Акида\n', '<h2>Акида</h2>', 'https://example.org/Акида',
        ]
        for sample in samples:
            with self.subTest(sample=sample):
                result, added = self.linker.link(sample)
                self.assertEqual(result, sample)
                self.assertEqual(added, set())

    def test_text_nodes_keep_attributes(self):
        source = '<p title="Акида > слово" data-slug="Таджвид">Акида</p>'
        result, added = self.linker.link(source)
        self.assertIn('<p title="Акида > слово" data-slug="Таджвид">', result)
        self.assertIn('>Акида</a>', result)
        self.assertEqual(added, {"akida"})

    def test_existing_links_are_recorded_without_duplicates(self):
        samples = [
            '<a\n href=\'/glossary/akida\'>Акида</a> Акида',
            '[Акида](/glossary/akida) Акида',
            '<a href="https://hutba.org/glossary/akida?x=1">Акида</a> Акида',
            '[Акида][ref]\n  [ref]: /glossary/akida\nАкида',
        ]
        for source in samples:
            with self.subTest(source=source):
                self.assertEqual(g.existing_terms(source, self.linker.slugs), {"akida"})
                self.assertEqual(self.linker.link(source), (source, set()))
        self.assertEqual(g.existing_terms('`<a href="/glossary/akida">Акида</a>`', self.linker.slugs), set())
        self.assertEqual(g.existing_terms('<a href="https://evil.org/glossary/akida">x</a>', self.linker.slugs), set())

    def test_ambiguous_alias_is_not_linked(self):
        linker = g.Linker([{"term": "Акида", "url_slug": "one"}, {"term": "Акида", "url_slug": "two"}])
        self.assertEqual(linker.link("Акида"), ("Акида", set()))

    def test_homonyms_and_personal_names(self):
        linker = g.Linker([
            {"term": "Айн", "url_slug": "ajn"}, {"term": "Хасан", "url_slug": "khasan"},
            {"term": "Халиль", "url_slug": "khalil"}, {"term": "Дин", "url_slug": "din"},
        ])
        for text in ('Буква «айн».', "Фард 'айн.", 'Халиль ибн Ахмад', '**Халиль** ибн Ахмад', 'Ибн Хасан', 'Имам <b>Хасан</b>', 'Ибн аль-Хасан', 'Фахр ад-Дин'):
            self.assertEqual(linker.link(text), (text, set()))
        self.assertEqual(linker.link('Айн означает сглаз.')[1], {'ajn'})
        self.assertEqual(linker.link('<b>Айн</b> означает сглаз.')[1], {'ajn'})
        self.assertEqual(linker.link('Хадис хасан.')[1], {'khasan'})

    def test_update_frontmatter_preserves_other_fields_and_body(self):
        source = '---\r\nterm: "Акида"\r\nrelated: []\r\nused_in:\r\n- old.md\r\ndescription: "Мой текст: без изменений."\r\n---\r\n\r\n<p>Статья</p>'
        updated = g.replace_yaml_list(source, "used_in", ["/quran/test/?lesson=one"])
        self.assertIn('description: "Мой текст: без изменений."\r\n---\r\n\r\n<p>Статья</p>', updated)
        self.assertEqual(g.split_frontmatter(updated)[1]["used_in"], ["/quran/test/?lesson=one"])
        self.assertEqual(g.split_frontmatter(updated)[2], g.split_frontmatter(source)[2])
        self.assertEqual(g.replace_yaml_list(updated, "used_in", ["/quran/test/?lesson=one"]), updated)


class ProjectTests(unittest.TestCase):
    def test_markdown_bundles_shared_sources_backlinks_and_idempotence(self):
        cache = Path(__file__).resolve().parent.parent / '.astro'
        cache.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='test-glossary-', dir=cache) as directory:
            root = Path(directory)
            self.assertEqual(root.resolve().parent, cache.resolve())

            def put(name, text):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
                return path

            for term, slug in [("Акида", "akida"), ("Таджвид", "tadzhvid")]:
                put(f"src/content/glossary/{slug}.md", f'---\nterm: {term}\nurl_slug: {slug}\nused_in: []\nrelated: []\ndescription: "Авторское описание"\n---\n<p>Авторская статья</p>\n')
            for slug in ("one", "two"):
                put(f"src/content/courses/akida/{slug}.yml", f'subject: akida\nslug: {slug}\ntitle: Курс {slug}\n')
                put(f"src/content/lessons/akida/{slug}/01-Allaha.md", '---\ntitle: Урок\ndescription: Акида\n---\n<a href="/glossary/akida">Акида</a> Таджвид.\n')
            for slug in ("interactive", "other"):
                put(f"src/content/courses/quran/{slug}.yml", f'subject: quran\nslug: {slug}\ntitle: Курс {slug}\ntype: interactive\n')
            bundle = [
                {"id": 1, "slug": "first", "title": "Акида", "description": "Таджвид", "blocks": [
                    {"type": "pronunciation", "description": "Акида", "points": ["Акида"], "notes": [{"text": "Акида"}], "makhraj": {"description": "Акида", "image": "/Акида.png"}},
                    {"type": "theory", "source": "theory.md"},
                ]},
                {"id": 2, "slug": "second", "title": "Второй", "blocks": [{"type": "theory", "source": "theory.md"}]},
            ]
            path = put("src/content/lessons/quran/interactive/lessons.bundle.json", json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
            put("src/content/lessons/quran/interactive/theory/theory.md", "---\ntitle: Теория\n---\nТаджвид.\n")
            single = {"id": 1, "slug": "single", "title": "Матн", "blocks": [{"type": "matn", "from": 1, "to": 1}]}
            put("src/content/lessons/quran/other/01.json", json.dumps(single))
            put("src/content/lessons/quran/koran-2-uroven/sharh.json", '{"1": "Акида и таджвид"}')
            put("src/content/lessons/quran/koran-2-uroven/mukaddima.json", '[{"n":1,"ar":"ع","ru":"Акида"}]')

            before = {file: g.read_text(file) for file in root.glob("**/*") if file.is_file()}
            with contextlib.redirect_stdout(io.StringIO()):
                preview = g.run(root)
            self.assertEqual({file: g.read_text(file) for file in before}, before)
            self.assertEqual(preview["interactive_lessons"], 3)
            with contextlib.redirect_stdout(io.StringIO()):
                report = g.run(root, True)
            modified = json.loads(g.read_text(path))
            self.assertEqual(modified[0]["description"], "Таджвид")
            self.assertEqual(modified[0]["title"], "Акида")
            self.assertEqual(modified[0]["blocks"][0]["makhraj"], bundle[0]["blocks"][0]["makhraj"])
            self.assertEqual(sum(json.dumps(block, ensure_ascii=False).count('class=\\"glossary-link\\"') for block in modified[0]["blocks"]), 1)
            usages = report["terms"]["tadzhvid"]
            self.assertEqual(len(usages), 5)
            self.assertTrue(any("course=one" in row["url"] for row in usages))
            self.assertTrue(any("course=two" in row["url"] for row in usages))
            self.assertTrue(any("01-allaha" in row["url"] for row in usages))
            self.assertFalse(any("Allaha" in row["url"] for row in usages))
            self.assertTrue(any("lesson=second" in row["url"] for row in usages))
            self.assertFalse(any("theory.md" in row["url"] for row in usages))
            after = {file: g.read_text(file) for file in before}
            with contextlib.redirect_stdout(io.StringIO()):
                rerun = g.run(root, True)
            self.assertEqual(rerun["new_links"], 0)
            self.assertEqual(rerun["changed_files"], [])
            self.assertEqual(rerun["terms"], report["terms"])
            self.assertEqual({file: g.read_text(file) for file in before}, after)


if __name__ == "__main__":
    unittest.main()
