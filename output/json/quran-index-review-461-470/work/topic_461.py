for p in sorted(W.glob('judgement_facts_*.py')):exec(p.read_text(encoding='utf-8'),globals())
for p in sorted(W.glob('judgement_decisions_*.py')):exec(p.read_text(encoding='utf-8'),globals())
facts={}
