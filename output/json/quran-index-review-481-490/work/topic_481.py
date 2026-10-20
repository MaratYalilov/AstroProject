assert topic_at(481)['see_also']==['поминание'] and not topic_at(481)['items']
assert any(t['title']=='поминание' and t['items'] for t in previous['topics'])
topic_at(481)['scope_note']='Перекрёстная ссылка на существующую ранее проверенную тему поминание. Самостоятельных аятов у этого пункта исходника нет; содержимое целевой темы сейчас не менялось.'
