assert topic_at(110)['see_also']==['пророк Дауд']
assert any(t['title']=='пророк Дауд' for t in original['topics'])
assert not topic_at(110)['items']
