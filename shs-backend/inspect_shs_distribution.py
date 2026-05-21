from app.database import SessionLocal
from app.models import WheatSHS
from sqlalchemy import func

s = SessionLocal()
try:
    # Get per-district category distribution
    dist_cats = s.query(WheatSHS.district, WheatSHS.category, func.count(WheatSHS.id)).group_by(WheatSHS.district, WheatSHS.category).all()
    dist_map = {}
    for dist, cat, cnt in dist_cats:
        dist_map.setdefault(dist, {})[cat] = cnt

    for dist, cats in dist_map.items():
        total = sum(cats.values())
        print(f"{dist}: total={total}, " + ", ".join([f"{k}={v} ({v/total:.1%})" for k, v in cats.items()]))

    # Also show top 5 districts by total
    sorted_by_total = sorted(dist_map.items(), key=lambda x: sum(x[1].values()), reverse=True)
    print('\nTop 5 districts by sample count:')
    for dist, cats in sorted_by_total[:5]:
        total = sum(cats.values())
        print(f"{dist}: {total}")
finally:
    s.close()
