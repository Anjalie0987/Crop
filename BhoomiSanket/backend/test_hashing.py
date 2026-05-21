from passlib.context import CryptContext
import sys

print(f"Python version: {sys.version}")

try:
    import bcrypt
    print(f"Bcrypt version: {bcrypt.__version__}")
except ImportError:
    print("Bcrypt not found")

def test_hash(scheme):
    print(f"\nTesting scheme: {scheme}")
    try:
        pwd_context = CryptContext(schemes=[scheme], deprecated="auto")
        h = pwd_context.hash("testpassword")
        print(f"Hash success: {h[:20]}...")
        verified = pwd_context.verify("testpassword", h)
        print(f"Verify success: {verified}")
        return True
    except Exception as e:
        print(f"Failed {scheme}: {e}")
        return False

test_hash("bcrypt")
test_hash("pbkdf2_sha256")
test_hash("sha256_crypt")
