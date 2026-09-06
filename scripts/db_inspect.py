import sqlite3

con = sqlite3.connect('db.sqlite3')
cur = con.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]

print("Tables in db.sqlite3:")
for tbl in tables:
    count = cur.execute(f"SELECT COUNT(*) FROM \"{tbl}\"").fetchone()[0]
    sample_ids = []
    try:
        sample_ids = [str(r[0]) for r in cur.execute(f"SELECT id FROM \"{tbl}\" LIMIT 3").fetchall()]
    except Exception:
        pass
    print(f"  {tbl}: {count} rows | sample ids: {sample_ids}")

con.close()
