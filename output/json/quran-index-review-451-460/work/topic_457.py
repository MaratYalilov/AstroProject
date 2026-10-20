for fear_module in sorted(W.glob('fear_*.py')):
 exec(fear_module.read_text(encoding='utf-8'),globals())
 persist_text(W/'fear-partial.json',json.dumps({'last_part':fear_module.name,'notes':notes,'decisions':list(decisions.values()),'changes':changes},ensure_ascii=False,indent=2)+'\n')
