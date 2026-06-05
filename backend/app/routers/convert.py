import json
import uuid
import time
from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator

from app.models.conversion import ConversionRequest, FeedbackRequest
from app.services.sql_parser import OracleSqlParser
from app.services.prompt_builder import PromptBuilder
from app.services.llm_client import openrouter_client, resolve_model
from app.services.response_parser import PySparkResponseParser
from app.database import get_db_path
from app.config import settings
import aiosqlite
import structlog

logger = structlog.get_logger()
router = APIRouter()

sql_parser = OracleSqlParser()
prompt_builder = PromptBuilder()
response_parser = PySparkResponseParser()


async def save_conversion(
    conversion_id: str,
    request: ConversionRequest,
    output_code: str,
    explanation: str,
    status: str,
    token_count: int,
    latency_ms: int,
    error_msg: str = None,
):
    try:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO conversions
                   (id, input_sql, input_type, target_fmt, model_used,
                    output_code, explanation, status, token_count, latency_ms, error_msg)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    conversion_id,
                    request.sql,
                    request.input_type,
                    request.target_format,
                    resolve_model(request.model),
                    output_code,
                    explanation,
                    status,
                    token_count,
                    latency_ms,
                    error_msg,
                ),
            )
            await db.commit()
    except Exception as e:
        logger.error("db_save_error", error=str(e))


@router.post("/convert")
async def convert_sql(request: ConversionRequest, http_request: Request):
    """Main conversion endpoint — streams SSE tokens from LLM."""

    # Validate API key
    if not settings.OPENROUTER_API_KEY:
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # Validate input length
    if len(request.sql) > settings.MAX_INPUT_LENGTH:
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Input too long. Maximum {settings.MAX_INPUT_LENGTH} characters allowed.'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    conversion_id = str(uuid.uuid4())
    start_time = time.time()

    async def stream_response() -> AsyncGenerator[str, None]:
        full_output = []
        token_count = 0
        status = "failed"
        error_msg = None

        try:
            # Parse SQL
            parse_result = sql_parser.parse(request.sql, request.input_type)

            # Send parse info to client
            yield f"data: {json.dumps({'type': 'parse_info', 'input_type': parse_result.input_type, 'complexity': parse_result.complexity, 'constructs': parse_result.constructs[:10]})}\n\n"

            # Build prompt
            messages = prompt_builder.build_messages(
                sql=request.sql,
                parse_result=parse_result,
                target_format=request.target_format,
                options=request.options,
            )

            # Stream from LLM
            async for token in openrouter_client.stream_convert(messages, request.model):
                full_output.append(token)
                token_count += 1
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Parse response
            raw_output = "".join(full_output)
            parsed = response_parser.parse(raw_output)

            latency_ms = int((time.time() - start_time) * 1000)
            status = "completed"

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'conversion_id': conversion_id, 'token_count': token_count, 'latency_ms': latency_ms, 'input_type': parse_result.input_type, 'complexity': parse_result.complexity})}\n\n"

            # Save to DB (non-blocking)
            await save_conversion(
                conversion_id=conversion_id,
                request=request,
                output_code=parsed.pyspark_code,
                explanation=parsed.explanation,
                status=status,
                token_count=token_count,
                latency_ms=latency_ms,
            )

        except Exception as e:
            error_msg = str(e)
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error("conversion_error", error=error_msg, conversion_id=conversion_id)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

            await save_conversion(
                conversion_id=conversion_id,
                request=request,
                output_code="",
                explanation="",
                status="failed",
                token_count=token_count,
                latency_ms=latency_ms,
                error_msg=error_msg,
            )

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """Submit feedback for a conversion."""
    feedback_id = str(uuid.uuid4())
    try:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                "INSERT INTO feedback (id, conversion_id, rating, comment) VALUES (?, ?, ?, ?)",
                (feedback_id, feedback.conversion_id, feedback.rating, feedback.comment),
            )
            await db.commit()
        return {"status": "ok", "feedback_id": feedback_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}
