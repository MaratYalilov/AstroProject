exec((W/'helpers.py').read_text(encoding='utf-8'),globals())
t=topic_at(408)
assert not t['items'] and t['see_also']==['блага']
assert any(x['title']=='блага' for x in original['topics'])
t['scope_note']='Отсылочная статья: «рузи» отсылает к теме «блага» (topic-0055, позиция 55). Собственных ссылок на аяты здесь нет; новые связи не создавались.'
topic_changes.append({'topic_id':t['id'],'reason':'Проверено наличие целевой статьи «блага» и сохранён исходный перекрёстный указатель. Содержание ранее завершённой темы 55 не перепроверялось и не менялось.'})
