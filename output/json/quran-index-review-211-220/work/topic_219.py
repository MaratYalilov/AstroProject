for module in ['topic_219_small.py','topic_219_denial.py','topic_219_persecution.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
