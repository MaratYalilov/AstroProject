rename(169,2,'Всеведение Бога: сокровенное, явное, сердца и человеческие деяния','Сохраняются конкретные утверждения знания, наблюдения и осведомлённости; чужие человеческие догадки не принимаются за Божье знание.')
for name in ('topic_169_teaching.py','topic_169_omniscience_early.py','topic_169_omniscience_middle.py','topic_169_omniscience_late.py','topic_169_human.py'):
    if (W/name).exists():exec((W/name).read_text(encoding='utf-8'),globals())
