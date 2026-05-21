from app.database import SessionLocal
from app.models import WheatSHS
from sqlalchemy import func

s = SessionLocal()
try:
    total = s.query(WheatSHS).count()
    print('total rows in wheat_shs:', total)

    rows = s.query(WheatSHS.district, func.count(WheatSHS.id)).group_by(WheatSHS.district).all()
    print('district counts sample (first 20):', rows[:20])

    cats = s.query(WheatSHS.category, func.count(WheatSHS.id)).group_by(WheatSHS.category).all()
    print('category counts:', cats)
finally:
    s.close()
