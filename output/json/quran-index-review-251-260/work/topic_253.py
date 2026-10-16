assert not topic_at(253)['items']
assert topic_at(253)['see_also']==['иффат']
target=next(t for t in original['topics'] if t['id']!=topic_at(253)['id'] and t['title'].lstrip("'").casefold().startswith('иффат'))
topic_changes.append({'topic_id':topic_at(253)['id'],'before':{'see_also':['иффат']},'after':{'see_also':[target['title']]},'reason':'Ссылка-синоним уточнена до существующего полного названия целевой темы без повторной проверки её содержания.'})
topic_at(253)['see_also']=[target['title']]
