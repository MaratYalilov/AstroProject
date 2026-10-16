for module in ['topic_230_early.py','topic_230_late.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
