for creation_module in sorted(W.glob('creation_*.py')):
 exec(creation_module.read_text(encoding='utf-8'),globals())
 persist_text(W/'creation-partial.json',json.dumps({'last_part':creation_module.name,'notes':notes,'decisions':list(decisions.values()),'changes':changes},ensure_ascii=False,indent=2)+'\n')
