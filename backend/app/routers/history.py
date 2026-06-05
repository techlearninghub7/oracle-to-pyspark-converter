from fastapi import APIRouter, Query
from typing import Optional

from app.database import get_db_path
from app.models.conversion import HistoryResponse, ConversionDetail, ConversionSummary
import aiosqlite

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    input_type: Optional[str] = Query(default=None),
):
    """Get conversion history."""
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        if input_type:
            cursor = await db.execute(
                """SELECT id, created_at, input_type, target_fmt, model_used,
                          status, token_count, latency_ms,
                          SUBSTR(input_sql, 1, 100) as preview
                   FROM conversions
                   WHERE input_type = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (input_type, limit),
            )
        else:
            cursor = await db.execute(
                """SELECT id, created_at, input_type, target_fmt, model_used,
                          status, token_count, latency_ms,
                          SUBSTR(input_sql, 1, 100) as preview
                   FROM conversions
                   ORDER BY created_at DESC LIMIT ?""",
                (limit,),
            )

        rows = await cursor.fetchall()

        # Get total count
        count_cursor = await db.execute("SELECT COUNT(*) FROM conversions")
        total_row = await count_cursor.fetchone()
        total = total_row[0] if total_row else 0

        conversions = []
        for row in rows:
            conversions.append(
                ConversionSummary(
                    id=row["id"],
                    created_at=row["created_at"],
                    input_type=row["input_type"],
                    target_fmt=row["target_fmt"],
                    model_used=row["model_used"],
                    status=row["status"],
                    token_count=row["token_count"] or 0,
                    latency_ms=row["latency_ms"] or 0,
                    preview=row["preview"],
                )
            )

        return HistoryResponse(conversions=conversions, total=total)


@router.get("/history/{conversion_id}", response_model=ConversionDetail)
async def get_conversion(conversion_id: str):
    """Get full conversion details by ID."""
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM conversions WHERE id = ?", (conversion_id,)
        )
        row = await cursor.fetchone()
        if not row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Conversion not found")

        return ConversionDetail(
            id=row["id"],
            created_at=row["created_at"],
            input_type=row["input_type"],
            target_fmt=row["target_fmt"],
            model_used=row["model_used"],
            status=row["status"],
            token_count=row["token_count"] or 0,
            latency_ms=row["latency_ms"] or 0,
            input_sql=row["input_sql"],
            output_code=row["output_code"],
            explanation=row["explanation"],
            error_msg=row["error_msg"],
        )


@router.delete("/history/{conversion_id}")
async def delete_conversion(conversion_id: str):
    """Delete a conversion from history."""
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DELETE FROM conversions WHERE id = ?", (conversion_id,))
        await db.commit()
    return {"status": "ok"}
