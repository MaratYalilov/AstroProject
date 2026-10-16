for name in ('topic_185_general.py','topic_185_prophets_early.py','topic_185_prophets_late.py','topic_185_concessions.py','topic_185_pillars.py'):
    if (W/name).exists():exec((W/name).read_text(encoding='utf-8'),globals())
