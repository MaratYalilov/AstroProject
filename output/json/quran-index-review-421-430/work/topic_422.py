# Every subtopic is saved as a separate manually written module.
for satan_module in sorted(W.glob('satan_*.py')):
 exec(satan_module.read_text(encoding='utf-8'),globals())
 persist_text(W/'satan-satan_moduleial.json',json.dumps({'last_satan_module':satan_module.name,'notes':notes,'decisions':list(decisions.values()),'changes':changes},ensure_ascii=False,indent=2)+'\n')
