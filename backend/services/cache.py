"""
파일 기반 일일 캐시. Redis 안 씀.
키 = 키워드 + 오늘 날짜 → 24시간 TTL 효과.
"""
from __future__ import annotations
import json
from datetime import date
from pathlib import Path

CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _path(keyword: str) -> Path:
    import hashlib
    hashed = hashlib.md5(keyword.encode("utf-8")).hexdigest()[:12]
    safe   = "".join(c for c in keyword if c.isascii() and (c.isalnum() or c in "_-"))[:20]
    name   = f"{safe}_{hashed}" if safe else hashed
    return CACHE_DIR / f"{name}_{date.today().isoformat()}.json"


def load(keyword: str) -> dict | None:
    p = _path(keyword)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save(keyword: str, data: dict) -> None:
    try:
        _path(keyword).write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[cache.save] failed: {e}")
