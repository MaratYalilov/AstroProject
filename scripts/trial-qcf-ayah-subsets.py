"""Split all 604 QCF V2 page fonts into validated per-ayah WOFF2 files."""

import argparse
import copy
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
FORMAT = 'hutba-qcf-v2-ayah-subsets-v1'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def font_tools(directory=None):
    if directory and str(directory) not in sys.path:
        sys.path.insert(0, str(directory))
    try:
        import brotli  # noqa: F401 - required for WOFF2
        import fontTools
        from fontTools import subset
        from fontTools.pens.recordingPen import DecomposingRecordingPen
        from fontTools.ttLib import TTFont
    except ImportError as error:
        raise ValueError('Install dependencies: python -m pip install -r scripts/requirements-qcf-subsets.txt') from error
    logging.getLogger('fontTools').setLevel(logging.ERROR)
    return fontTools, subset, DecomposingRecordingPen, TTFont


def page_selection(value):
    selected = set()
    for part in value.split(','):
        match = re.fullmatch(r'(\d+)(?:-(\d+))?', part.strip())
        if not match:
            raise argparse.ArgumentTypeError('Pages must look like 1-604 or 1,148,264-266')
        start, end = int(match[1]), int(match[2] or match[1])
        if not 1 <= start <= end <= 604:
            raise argparse.ArgumentTypeError('Page range must be between 1 and 604')
        selected.update(range(start, end + 1))
    return selected


def read_mapping(filename):
    payload = filename.read_bytes()
    mapping = json.loads(payload)
    if not isinstance(mapping, dict) or not mapping:
        raise ValueError('The QCF map must be a nonempty object')
    for ref, entry in mapping.items():
        match = re.fullmatch(r'([1-9]\d*):([1-9]\d*)', ref)
        if not match or int(match[1]) > 114 or int(match[2]) > 286:
            raise ValueError(f'Invalid ayah reference: {ref}')
        if not isinstance(entry, dict) or type(entry.get('page')) is not int or not 1 <= entry['page'] <= 604:
            raise ValueError(f'Invalid QCF page: {ref}')
        if not isinstance(entry.get('code_v2'), str) or not entry['code_v2'].strip():
            raise ValueError(f'Missing QCF codes: {ref}')
    return mapping, digest(payload)


def coverage(font, entries):
    if 'COLR' in font or 'SVG ' in font or 'glyf' not in font:
        raise ValueError('This script validates monochrome QCF V2 only; colored QCF V4 needs a separate validator')
    cmap = font.getBestCmap()
    if not cmap:
        raise ValueError('Font has no Unicode cmap')
    for ref, entry in entries:
        missing = {char for char in entry['code_v2'] if ord(char) not in cmap and not char.isspace()}
        if missing:
            raise ValueError(f'{ref}: missing glyphs {sorted(hex(ord(c)) for c in missing)}')
    return cmap


def preflight(source, grouped, tools_dir):
    _, _, _, TTFont = font_tools(tools_dir)
    sources = {}
    for page, entries in sorted(grouped.items()):
        filename = source / f'p{page}.woff2'
        payload = filename.read_bytes()
        if payload[:4] != b'wOF2' or len(payload) < 48 or int.from_bytes(payload[8:12], 'big') != len(payload):
            raise ValueError(f'Invalid WOFF2: {filename}')
        with TTFont(filename) as font:
            coverage(font, entries)
        sources[str(page)] = {'sha256': digest(payload), 'bytes': len(payload)}
    return sources


def drawing(glyphs, name, pen_type):
    pen = pen_type(glyphs)
    glyphs[name].draw(pen)
    return pen.value


def make_page(job):
    page, entries, source_dir, output_dir, expected_hash, tools_dir = job
    _, subset, pen_type, TTFont = font_tools(tools_dir)
    source_path = Path(source_dir) / f'p{page}.woff2'
    if digest(source_path.read_bytes()) != expected_hash:
        raise ValueError(f'Input font changed after preflight: p{page}.woff2')
    records = {}
    with TTFont(source_path) as original:
        cmap = coverage(original, entries)
        original_glyphs = original.getGlyphSet()
        outlines = {}
        for ref, entry in entries:
            filename = ref.replace(':', '-') + '.woff2'
            target = Path(output_dir) / filename
            temporary = target.with_name(f'.{filename}.{os.getpid()}.tmp')
            font = copy.deepcopy(original)
            try:
                options = subset.Options()
                options.flavor = 'woff2'
                options.layout_features = ['*']
                options.layout_scripts = ['*']
                options.hinting = True
                options.glyph_names = True
                options.notdef_outline = True
                options.recalc_timestamp = False
                options.recalc_bounds = False
                options.ignore_missing_unicodes = False
                cutter = subset.Subsetter(options=options)
                cutter.populate(unicodes={ord(char) for char in entry['code_v2'] if ord(char) in cmap})
                cutter.subset(font)
                # Preserve rounded original bounds and bearings exactly.
                font.recalcBBoxes = False
                font.recalcTimestamp = False
                font.flavor = 'woff2'
                font.save(temporary)
                with TTFont(temporary) as generated:
                    after = generated.getBestCmap()
                    glyphs = generated.getGlyphSet()
                    if original['head'].unitsPerEm != generated['head'].unitsPerEm:
                        raise ValueError(f'{ref}: unitsPerEm changed')
                    for char in set(entry['code_v2']):
                        if ord(char) not in cmap:
                            if ord(char) in after:
                                raise ValueError(f'{ref}: whitespace fallback changed')
                            continue
                        old_name, new_name = cmap[ord(char)], after.get(ord(char))
                        if new_name is None:
                            raise ValueError(f'{ref}: lost character U+{ord(char):04X}')
                        if old_name not in outlines:
                            outlines[old_name] = drawing(original_glyphs, old_name, pen_type)
                        if outlines[old_name] != drawing(glyphs, new_name, pen_type):
                            raise ValueError(f'{ref}: outline changed for U+{ord(char):04X}')
                        if original['hmtx'][old_name] != generated['hmtx'][new_name]:
                            raise ValueError(f'{ref}: glyph metrics changed')
                    glyph_count = len(generated.getGlyphOrder())
                payload = temporary.read_bytes()
                records[ref] = {'file': filename, 'page': page, 'bytes': len(payload), 'sha256': digest(payload),
                                'sourceSha256': expected_hash, 'codesSha256': digest(entry['code_v2'].encode('utf-8')),
                                'glyphs': glyph_count, 'validated': True}
                os.replace(temporary, target)
            finally:
                font.close()
                temporary.unlink(missing_ok=True)
    if digest(source_path.read_bytes()) != expected_hash:
        raise ValueError(f'Input font changed during subsetting: p{page}.woff2')
    return records


def write_manifest(path, manifest):
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT / 'public/fonts/mushaf-v2-woff2')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'public/fonts/qcf-ayah-v2')
    parser.add_argument('--map', type=Path, default=ROOT / 'src/data/quran-qcf-v2.json')
    parser.add_argument('--pages', type=page_selection, help='Default: all pages in the map; e.g. 1,148,264-266')
    parser.add_argument('--ayahs', help='Optional comma-separated references, e.g. 16:36,6:151')
    parser.add_argument('--workers', type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument('--resume', action='store_true', help='Verify and reuse existing output files')
    parser.add_argument('--check', action='store_true', help='Validate source coverage only; write no files')
    parser.add_argument('--tools-dir', type=Path, help='Optional directory containing fontTools and Brotli')
    args = parser.parse_args(argv)
    if args.workers < 1:
        parser.error('--workers must be positive')
    source, output = args.source_dir.resolve(), args.output_dir.resolve()
    if source == output or source in output.parents or output in source.parents:
        parser.error('Source and output must be separate, non-nested directories')
    tools_dir = str(args.tools_dir.resolve()) if args.tools_dir else None
    tools, _, _, _ = font_tools(tools_dir)
    mapping, mapping_hash = read_mapping(args.map)
    requested = {ref.strip() for ref in args.ayahs.split(',')} if args.ayahs is not None else set(mapping)
    if requested - mapping.keys():
        raise ValueError(f'Unknown ayahs: {sorted(requested - mapping.keys())}')
    grouped = {}
    for ref in sorted(requested, key=lambda ref: tuple(map(int, ref.split(':')))):
        entry = mapping[ref]
        if args.pages is None or entry['page'] in args.pages:
            grouped.setdefault(entry['page'], []).append((ref, entry))
    if not grouped:
        raise ValueError('No ayahs selected')
    sources = preflight(source, grouped, tools_dir)
    count = sum(map(len, grouped.values()))
    print(f'Checked {len(grouped)} page fonts and {count} ayahs', flush=True)
    if args.check:
        return 0
    manifest_path = output / 'manifest.json'
    identity = {'format': FORMAT, 'mappingSha256': mapping_hash, 'fontTools': tools.__version__,
                'settings': {'hinting': True, 'layoutFeatures': '*', 'glyphNames': True,
                             'recalcBounds': False, 'recalcTimestamp': False}}
    manifest = {**identity, 'sources': {}, 'files': {}}
    if output.exists() and any(output.iterdir()):
        if not args.resume or not manifest_path.is_file():
            raise ValueError('Output is not empty. Use a new output directory or --resume with its manifest')
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if any(manifest.get(key) != value for key, value in identity.items()):
            raise ValueError('Output manifest is incompatible with this map/tool version. Use a new output directory')
    output.mkdir(parents=True, exist_ok=True)
    jobs, skipped = [], 0
    for page, entries in sorted(grouped.items()):
        pending = []
        for ref, entry in entries:
            record = manifest['files'].get(ref, {})
            filename = ref.replace(':', '-') + '.woff2'
            target = output / filename
            valid = (record.get('file') == filename and record.get('validated') is True
                     and record.get('sourceSha256') == sources[str(page)]['sha256']
                     and record.get('codesSha256') == digest(entry['code_v2'].encode('utf-8'))
                     and target.is_file() and record.get('sha256') == digest(target.read_bytes()))
            if args.resume and valid:
                skipped += 1
            else:
                pending.append((ref, entry))
        if pending:
            jobs.append((page, pending, str(source), str(output), sources[str(page)]['sha256'], tools_dir))
    manifest['sources'].update(sources)
    write_manifest(manifest_path, manifest)
    generated = 0
    try:
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(make_page, job) for job in jobs]
            for index, future in enumerate(as_completed(futures), 1):
                records = future.result()
                manifest['files'].update(records)
                generated += len(records)
                if index % 5 == 0:
                    write_manifest(manifest_path, manifest)
                print(f'Generated {generated}, reused {skipped}, selected {count}', flush=True)
    finally:
        write_manifest(manifest_path, manifest)
    print(f'Done: {generated} generated, {skipped} reused. Output: {output}', flush=True)
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError) as error:
        print(f'Error: {error}', file=sys.stderr)
        sys.exit(1)
