import aiosqlite
import os
from app.config import settings


async def get_db_path() -> str:
    db_path = settings.DATABASE_URL
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)
    return db_path


async def init_db():
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS conversions (
                id          TEXT PRIMARY KEY,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                input_sql   TEXT NOT NULL,
                input_type  TEXT NOT NULL,
                target_fmt  TEXT NOT NULL,
                model_used  TEXT NOT NULL,
                output_code TEXT,
                explanation TEXT,
                status      TEXT DEFAULT 'pending',
                token_count INTEGER DEFAULT 0,
                latency_ms  INTEGER DEFAULT 0,
                error_msg   TEXT
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id              TEXT PRIMARY KEY,
                conversion_id   TEXT REFERENCES conversions(id),
                rating          INTEGER CHECK(rating BETWEEN 1 AND 5),
                comment         TEXT,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS usage_stats (
                date          TEXT,
                model         TEXT,
                input_type    TEXT,
                request_count INTEGER DEFAULT 0,
                total_tokens  INTEGER DEFAULT 0,
                PRIMARY KEY (date, model, input_type)
            );
        """)
        await db.commit()


async def get_db():
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        yield db
