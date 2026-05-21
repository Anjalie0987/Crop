from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class WheatGerminationSHS(Base):
    __tablename__ = "wheat_shs_germination"

    id = Column(Integer, primary_key=True, index=True)
    pixel_id = Column(String, nullable=True)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    shs = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # Good, Fair, Poor
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WheatBootingSHS(Base):
    __tablename__ = "wheat_shs_booting"

    id = Column(Integer, primary_key=True, index=True)
    pixel_id = Column(String, nullable=True)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    shs = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # Good, Fair, Poor
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# NEW: lat-long germination+booting pipeline (separate table; does not mix with existing district-based records)
class LatLonSuitability(Base):
    __tablename__ = "latlon_suitability"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, index=True, nullable=False)  # group a processing run
    source_file = Column(String, nullable=False)

    # Original input columns (store as-is)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    n = Column(Float, nullable=True)
    p = Column(Float, nullable=True)
    k = Column(Float, nullable=True)
    moisture = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)
    oc = Column(Float, nullable=True)
    temp = Column(Float, nullable=True)
    ndvi = Column(Float, nullable=True)  # may be injected for booting if missing

    # Outputs (both stages)
    germ_shs = Column(Float, nullable=True)
    germ_category = Column(String, nullable=True)
    boot_shs = Column(Float, nullable=True)
    boot_category = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
