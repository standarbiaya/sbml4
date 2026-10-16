from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parents[1]
required=['worker/index.ts','wrangler.jsonc','migrations/0001_initial.sql','SETUP-D1-CONSOLE.sql','src/App.tsx','src/lib/api.ts','index.html']
for path in required:
    assert (root/path).is_file(),f'Missing: {path}'
connection=sqlite3.connect(':memory:')
connection.executescript((root/'SETUP-D1-CONSOLE.sql').read_text())
expect=['settings','publications','items','rates','regulations','item_regulations','documents','faqs','sync_logs']
found={r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
assert set(expect)<=found
connection.executescript((root/'SETUP-D1-CONSOLE.sql').read_text())
print('OK: structure and idempotent SQL verified; 9 application tables created.')
