import sqlite3

db_path = r'd:\CROP2\CROP2\BhoomiSanket\backend\data.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    query = "SELECT MIN(nitrogen), MAX(nitrogen), AVG(nitrogen), MIN(phosphorus), MAX(phosphorus), AVG(phosphorus), MIN(potassium), MAX(potassium), AVG(potassium), MIN(ph), MAX(ph), AVG(ph), MIN(organic_carbon), MAX(organic_carbon), AVG(organic_carbon), MIN(moisture), MAX(moisture), AVG(moisture), MIN(temperature), MAX(temperature), AVG(temperature) FROM soil_germination_data"
    cursor.execute(query)
    results = cursor.fetchone()

    columns = ["Nitrogen", "Phosphorus", "Potassium", "pH", "Organic Carbon", "Moisture", "Temperature"]
    for i, col in enumerate(columns):
        print(f"{col}: Min={results[i*3]}, Max={results[i*3+1]}, Avg={results[i*3+2]}")
except Exception as e:
    print(f"Error: {e}")

conn.close()
