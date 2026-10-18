exec((W/'helpers.py').read_text(encoding='utf-8'),globals())
for section in sorted(W.glob('section_351_*.py')):
    exec(section.read_text(encoding='utf-8'),globals())
