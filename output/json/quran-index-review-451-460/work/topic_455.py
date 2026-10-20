for justice_module in sorted(W.glob('justice_*.py')):
 exec(justice_module.read_text(encoding='utf-8'),globals())
 persist_text(W/'justice-partial.json',json.dumps({'last_part':justice_module.name,'notes':notes,'decisions':list(decisions.values()),'changes':changes},ensure_ascii=False,indent=2)+'\n')
