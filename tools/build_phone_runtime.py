"""Replace only the embedded real-phone plugin, leaving other software intact."""
import json,re
from pathlib import Path
target=Path('js/61-soft.js')
packed=target.read_text(encoding='utf-8')
matches=list(re.finditer(r'new Function\(\'X\', \'applyMacros\', ("/\* 📲 真手机(?:[^"\\]|\\.)*")\)',packed))
assert len(matches)==1, 'Expected exactly one real-phone runtime'
m=matches[0]
source=Path('插件/软件/源码/60-真手机.js').read_text(encoding='utf-8')
literal=json.dumps(source,ensure_ascii=False)
target.write_text(packed[:m.start(1)]+literal+packed[m.end(1):],encoding='utf-8')
print('Updated embedded real-phone runtime from source; other plugin bodies preserved')
