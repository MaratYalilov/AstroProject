for section in sorted(W.glob('section_340_*.py')):
    exec(section.read_text(encoding='utf-8'),globals())
    persist_text(W/'checkpoint.json',json.dumps({'status':'partial_manual_review','batch':'331-340','last_module':section.name,'topics':topics,'notes':notes,'decisions':list(decisions.values()),'sources':sources,'description_changes':changes,'topic_changes':topic_changes},ensure_ascii=False,indent=2)+'\n')
