import os
import sqlite3
from dotenv import load_dotenv

# Load environment variables
load_dotenv(r"D:/CROP2/CROP2/BhoomiSanket/backend/.env")

db_path = r"D:/CROP2/CROP2/BhoomiSanket/backend/soil_data.db"

def check_db():
    if not os.path.exists(db_path):
        print(f"Error: DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Checking soil_germination_data table...")
        cursor.execute("PRAGMA table_info(soil_germination_data);")
        columns = cursor.fetchall()
        for col in columns:
            print(f"Column: {col[1]}, Type: {col[2]}")
        
        print("\nFetching sample data (temperature)...")
        cursor.execute("SELECT pixel_id, temperature FROM soil_germination_data WHERE temperature IS NOT NULL LIMIT 5;")
        rows = cursor.fetchall()
        if not rows:
            print("No temperature data found or all values are NULL.")
        else:
            for row in rows:
                print(row)
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_db()
