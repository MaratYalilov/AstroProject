for module in ['topic_214_reading.py','topic_214_world.py','topic_214_revelation.py','topic_214_other.py']:
    if (W/module).exists():exec((W/module).read_text(encoding='utf-8-sig'),globals())
