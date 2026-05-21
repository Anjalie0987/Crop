from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.schemas.farmers import FarmerCreate, FarmerResponse, FarmerLogin
from passlib.context import CryptContext

# Password hashing context - Switching to pbkdf2_sha256 for stability on Python 3.14
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

router = APIRouter(
    prefix="/farmers",
    tags=["farmers"]
)

# Helpers
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=FarmerResponse, status_code=status.HTTP_201_CREATED)
def register_farmer(farmer: FarmerCreate, db: Session = Depends(get_db)):
    # Check if mobile number already exists
    db_farmer = db.query(models.Farmer).filter(models.Farmer.mobile_number == farmer.mobile_number).first()
    if db_farmer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered"
        )
    
    try:
        # pbkdf2_sha256 is pure Python, very stable, and doesn't have a 72-byte limit
        hashed_password = get_password_hash(farmer.password)
    except Exception as e:
        print(f"Hashing error: {e}") 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing password"
        )
    
    new_farmer = models.Farmer(
        full_name=farmer.full_name,
        mobile_number=farmer.mobile_number,
        gender=farmer.gender,
        dob=farmer.dob,
        state=farmer.state,
        district=farmer.district,
        village=farmer.village,
        plot_number=farmer.plot_number,
        password=hashed_password
    )
    
    db.add(new_farmer)
    db.commit()
    db.refresh(new_farmer)
    return new_farmer

@router.post("/login")
def login_farmer(credentials: FarmerLogin, db: Session = Depends(get_db)):
    db_farmer = db.query(models.Farmer).filter(models.Farmer.mobile_number == credentials.mobile_number).first()
    
    if not db_farmer or not verify_password(credentials.password, db_farmer.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password"
        )
    
    return {
        "message": "Login successful",
        "farmer": {
            "id": db_farmer.id,
            "full_name": db_farmer.full_name,
            "mobile_number": db_farmer.mobile_number
        }
    }
