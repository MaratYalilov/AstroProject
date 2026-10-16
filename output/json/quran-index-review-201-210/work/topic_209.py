for module in ['topic_209_small.py','topic_209_oaths.py','topic_209_oaths_late.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
