for module in ['topic_216_small.py','topic_216_early.py','topic_216_late.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
