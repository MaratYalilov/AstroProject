def topic_at(position):return topics[position-171]
def new_item(position,number,description,relation='thematic'):
    identity=ident(position,number);assert identity not in items
    row={'id':identity,'description':description,'relation_type':relation,'verse_keys':[]}
    topic_at(position)['items'].append(row);items[identity]=row;notes[identity]={}
def audited_copy(position,number,key,prior_item,**override):
    source=next(i for t in previous['topics'] for i in t['items'] if i['id']==prior_item)['verse_notes'][key]
    args={'explanation':source['explanation'],'anchor':source['key_phrase']['text'],'basis':source['basis'],'refs':source['source_ids'][1:],'context':source.get('context_verse_keys',[]),'qualification':source.get('qualification'),'usage':source.get('usage_note')}
    args.update(override);keep(position,number,key,**args)
def manual_rows(position,number,text,meta=None):
    for line in text.strip().splitlines():
        key,explanation,anchor,*ctx=line.split('|');ctx=ctx[0].split(',') if ctx else []
        keep(position,number,key,explanation=explanation,anchor=anchor,context=ctx,**{'basis':'passage_context' if ctx else 'quran_text',**(meta or {}).get(key,{})})

def discard_item(position,number,reason):
    identity=ident(position,number);assert not notes[identity]
    assert all(decisions[(identity,k)]['decision']=='remove' for k in old[identity]['verse_keys'])
    changes.append({'item_id':identity,'before':items[identity]['description'],'after':'Подпункт исключён','reason':reason})
    topic_at(position)['items']=[i for i in topic_at(position)['items'] if i['id']!=identity]
    items.pop(identity);notes.pop(identity)


