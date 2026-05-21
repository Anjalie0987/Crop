import psycopg2
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()

def test_conn(url, label):
    try:
        parsed = urllib.parse.urlparse(url)
        clean_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{parsed.port}{parsed.path}"
        line = f"Testing {label}: {clean_url}\n"
        
        conn = psycopg2.connect(url)
        line += f"SUCCESS for {label}\n"
        conn.close()
        return line
    except Exception as e:
        line += f"FAILED for {label}: {str(e)}\n"
        return line

results = []

# 1. ENV URL
env_url = os.getenv("DATABASE_URL")
results.append(test_conn(env_url, "ENV URL"))

# 2. post123
results.append(test_conn("postgresql://postgres:post123@127.0.0.1:5432/bhoomisanket_db", "post123"))

# 3. Anjali@2026 encoded
encoded_pass = urllib.parse.quote_plus("post123")
results.append(test_conn(f"postgresql://postgres:{encoded_pass}@127.0.0.1:5432/bhoomisanket_db", "Anjali@2026 (encoded)"))

# 4. Try common default '1234'
results.append(test_conn("postgresql://postgres:post123@127.0.0.1:5432/bhoomisanket_db", "1234"))

with open("test_results.txt", "w") as f:
    f.writelines(results)

print("Results written to test_results.txt")
