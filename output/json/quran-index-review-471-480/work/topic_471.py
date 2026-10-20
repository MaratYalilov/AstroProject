assert topic_at(471)['see_also']==['Кааба'] and not topic_at(471)['items']
assert any(t['title']=='Кааба' and t['items'] for t in previous['topics'])
topic_at(471)['scope_note']='Перекрёстная ссылка на тему Кааба. Самостоятельных ссылок на аяты в этом пункте исходника нет; существование целевой темы проверено, её ранее завершённое содержимое не менялось.'
