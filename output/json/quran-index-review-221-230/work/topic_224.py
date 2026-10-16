for module in ['topic_224_small.py','topic_224_early.py','topic_224_middle.py','topic_224_late.py','topic_224_facets.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
