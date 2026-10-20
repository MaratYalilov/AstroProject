exec((W/'helpers.py').read_text(encoding='utf-8'),globals())
t=topic_at(417);assert not t['items'] and t['see_also']==['намаз'];target=next(t for t in original['topics'] if t['title']=='намаз')
t['scope_note']='Отсылочная статья: «салат» отсылает к теме «намаз». Собственных аятов нет; новые связи не создавались.'
topic_changes.append({'topic_id':t['id'],'reason':'Проверены наличие темы «намаз» и целостность исходной отсылки. Целевая тема в этой партии не перепроверялась.'})
