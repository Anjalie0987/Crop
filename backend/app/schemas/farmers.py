from pydantic import BaseModel, constr
from typing import Optional
from datetime import datetime

class FarmerBase(BaseModel):
    full_name: str
    mobile_number: constr(min_length=10, max_length=10) # 10 digit requirement
    gender: Optional[str] = None
    dob: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    plot_number: Optional[str] = None

class FarmerCreate(FarmerBase):
    password: str

class FarmerLogin(BaseModel):
    mobile_number: constr(min_length=10, max_length=10)
    password: str

class FarmerResponse(FarmerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
