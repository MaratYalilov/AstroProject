assert topic_at(477)['see_also']==['развод'] and not topic_at(477)['items']
assert any(t['title']=='развод' and t['items'] for t in previous['topics'])
topic_at(477)['scope_note']='Перекрёстная ссылка на ранее проверенную тему развод. Собственных ссылок на аяты в этом пункте исходника нет; целевая тема существует, её завершённое содержимое не менялось.'
