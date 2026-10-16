import ast,re,sys
from pathlib import Path
w=Path(__file__).parent;source=(w/'review.py').read_text(encoding='utf-8');env={'__file__':str(w/'review.py')}
exec(source.split('\nparts = ')[0],env);sys.argv.append('--checkpoint')
orig=env['phrase'];errors=[]
def lint(key,anchor=None):
 try:return orig(key,anchor)
 except AssertionError:errors.append((key,anchor,env['ru'][key]));return env['ru'][key][:10]
env['phrase']=lint
for part in ast.literal_eval(re.search(r'^parts = (.+)$',source,re.M)[1]):
 if (w/part).exists():exec((w/part).read_text(encoding='utf-8'),env)
for error in errors:print(error)
print('Quote errors:',len(errors))
