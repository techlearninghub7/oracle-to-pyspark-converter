from fastapi import APIRouter
from app.models.conversion import HealthResponse
from app.services.llm_client import openrouter_client
from app.database import get_db_path
from app.config import settings
import aiosqlite

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    # Check DB
    db_status = "ok"
    try:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute("SELECT 1")
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check OpenRouter
    openrouter_status = "not_configured"
    if settings.OPENROUTER_API_KEY:
        is_reachable = await openrouter_client.check_health()
        openrouter_status = "reachable" if is_reachable else "unreachable"

    return HealthResponse(
        status="ok",
        openrouter=openrouter_status,
        db=db_status,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
    )


@router.get("/models")
async def get_models():
    """Return available model options."""
    from app.services.llm_client import MODELS
    return {
        "models": [
            {"key": k, "id": v, "label": _model_label(k, v)}
            for k, v in MODELS.items()
        ]
    }


def _model_label(key: str, model_id: str) -> str:
    labels = {
        "default": "Claude 3 Haiku (Recommended)",
        "fast": "Llama 3.1 8B (Free)",
        "balanced": "Mistral 7B (Free)",
        "powerful": "Claude 3.5 Sonnet (Best Quality)",
        "code": "DeepSeek Coder (Code Optimized)",
        "free": "Llama 3.1 8B (Free)",
    }
    return labels.get(key, model_id)
