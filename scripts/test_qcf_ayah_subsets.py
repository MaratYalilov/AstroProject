"""Focused CLI tests for QCF subsetting, using tiny disposable fonts."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

arguments = argparse.ArgumentParser(add_help=False)
arguments.add_argument('--tools-dir', type=Path)
options, unittest_args = arguments.parse_known_args()
if options.tools_dir:
    options.tools_dir = options.tools_dir.resolve()
    sys.path.insert(0, str(options.tools_dir))

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

SCRIPT = Path(__file__).with_name('trial-qcf-ayah-subsets.py')


class SubsetCliTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='hutba-qcf-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'pages'
        self.source.mkdir()
        self.output = self.root / 'ayahs'
        self.mapping = self.root / 'map.json'
        self.mapping.write_text(json.dumps({'1:1': {'page': 1, 'code_v2': '\ufc00 \ufc01'},
                                            '1:2': {'page': 1, 'code_v2': '\ufc00'}}), encoding='utf-8')
        builder = FontBuilder(1000, isTTF=True)
        names = ['.notdef', 'word', 'number']
        builder.setupGlyphOrder(names)
        builder.setupCharacterMap({0xFC00: 'word', 0xFC01: 'number'})
        glyphs = {}
        for index, name in enumerate(names):
            pen = TTGlyphPen(None)
            pen.moveTo((20, 0)); pen.lineTo((200 + index * 20, 0))
            pen.lineTo((200 + index * 20, 700)); pen.lineTo((20, 700)); pen.closePath()
            glyphs[name] = pen.glyph()
        builder.setupGlyf(glyphs)
        builder.setupHorizontalMetrics({name: (500, 20) for name in names})
        builder.setupHorizontalHeader(ascent=800, descent=-200)
        builder.setupNameTable({'familyName': 'QcfFixture', 'styleName': 'Regular'})
        builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
        builder.setupPost()
        builder.setupMaxp()
        builder.font.flavor = 'woff2'
        builder.save(self.source / 'p1.woff2')
        self.source_bytes = (self.source / 'p1.woff2').read_bytes()

    def cli(self, *extra, success=True):
        command = [sys.executable, str(SCRIPT), '--source-dir', str(self.source), '--output-dir', str(self.output),
                   '--map', str(self.mapping), '--workers', '1']
        if options.tools_dir:
            command += ['--tools-dir', str(options.tools_dir)]
        result = subprocess.run(command + list(extra), text=True, capture_output=True, timeout=60)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        self.assertEqual((self.source / 'p1.woff2').read_bytes(), self.source_bytes)
        return result

    def test_generation_resume_and_corrupt_file_recovery(self):
        self.cli()
        target = self.output / '1-1.woff2'
        manifest = json.loads((self.output / 'manifest.json').read_text())
        self.assertEqual(set(manifest['files']), {'1:1', '1:2'})
        self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), manifest['files']['1:1']['sha256'])
        before = target.stat().st_mtime_ns
        self.assertIn('0 generated, 2 reused', self.cli('--resume').stdout)
        self.assertEqual(target.stat().st_mtime_ns, before)
        target.write_bytes(b'broken')
        self.assertIn('1 generated, 1 reused', self.cli('--resume').stdout)
        self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), manifest['files']['1:1']['sha256'])

    def test_check_does_not_create_output(self):
        self.assertIn('1 page fonts and 2 ayahs', self.cli('--check').stdout)
        self.assertFalse(self.output.exists())

    def test_missing_character_fails_before_writing(self):
        mapping = json.loads(self.mapping.read_text())
        mapping['1:1']['code_v2'] = '\ufc09'
        self.mapping.write_text(json.dumps(mapping))
        self.assertIn('missing glyphs', self.cli(success=False).stderr)
        self.assertFalse(self.output.exists())

    def test_unrelated_nonempty_output_is_preserved(self):
        self.output.mkdir()
        note = self.output / 'keep.txt'; note.write_text('keep me')
        self.cli(success=False)
        self.assertEqual(note.read_text(), 'keep me')
        self.assertEqual(list(self.output.iterdir()), [note])

    def test_selection_and_invalid_arguments(self):
        self.cli('--ayahs', '1:2')
        self.assertEqual(set(json.loads((self.output / 'manifest.json').read_text())['files']), {'1:2'})
        self.cli('--ayahs', '1:99', '--resume', success=False)
        self.cli('--pages', '0', success=False)
        self.cli('--output-dir', str(self.source), success=False)
        self.cli('--output-dir', str(self.source / 'nested'), success=False)


if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0], *unittest_args])
