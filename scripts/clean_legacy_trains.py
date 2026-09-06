import sqlite3

con = sqlite3.connect('db.sqlite3')
cur = con.cursor()

tables_to_clear = [
    'trains_coachcomposition',
    'trains_platformallocation',
    'trains_trainschedule',
    'trains_trainlivestatus',
    'trains_train',
]

print("Clearing legacy train data...")
for tbl in tables_to_clear:
    cur.execute(f"DELETE FROM {tbl}")
    print(f"Cleared {tbl}")

con.commit()
print("Commit complete. Checking row counts:")
for tbl in tables_to_clear:
    cnt = cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    print(f"  {tbl}: {cnt} rows")

con.close()
