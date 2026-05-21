import sqlite3

db_path = r'd:\CROP2\CROP2\BhoomiSanket\backend\data.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"Tables: {tables}")

conn.close()
