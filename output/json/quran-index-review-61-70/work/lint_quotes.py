from pathlib import Path
import sys
sys.stdout.reconfigure(encoding='utf-8')
w=Path(__file__).parent
env={'__file__':str(w/'review.py')}
exec((w/'review.py').read_text(encoding='utf-8').split("parts = ['topics_61_62.py'")[0],env)
orig=env['phrase']; errors=[]
def lint(key,anchor=None):
    try:return orig(key,anchor)
    except AssertionError:
        errors.append((key,anchor,env['ru'][key]));return env['ru'][key][:10]
env['phrase']=lint
for p in ['topics_61_62.py','topic_63.py','topics_64_69.py','topic_70_a.py','topic_70_b.py']:
    if (w/p).exists():exec((w/p).read_text(encoding='utf-8'),env)
for e in errors:print(e)
print('Quote errors:',len(errors))
