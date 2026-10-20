assert topic_at(484)['see_also']==['Библия'] and not topic_at(484)['items']
target=next(t for t in previous['topics'] if t['id']=='topic-0052');assert target['items']
topic_at(484)['see_also']=[target['title']]
topic_changes.append({'topic_id':topic_at(484)['id'],'see_also_before':['Библия'],'see_also_after':[target['title']],'reason':'Целевая тема topic-0052 ранее переименована в Прежние Небесные Писания. Перекрёстная ссылка обновлена на её фактическое название без изменения ранее проверенной темы.'})
topic_at(484)['scope_note']='Навигационная ссылка на тему Прежние Небесные Писания (topic-0052), названную в исходнике Библия. Собственных аятов у этого пункта исходника нет; целевая тема существует и не менялась.'
