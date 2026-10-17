for section in sorted(W.glob('section_267_*.py')):
    exec(section.read_text(encoding='utf-8-sig'),globals())
