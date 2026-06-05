import json
import httpx
from typing import AsyncGenerator
from app.config import settings


# Available models with fallback chain
MODELS = {
    "default":   "anthropic/claude-3-haiku",
    "fast":      "meta-llama/llama-3.1-8b-instruct:free",
    "balanced":  "mistralai/mistral-7b-instruct:free",
    "powerful":  "anthropic/claude-3.5-sonnet",
    "code":      "deepseek/deepseek-coder",
    "free":      "meta-llama/llama-3.1-8b-instruct:free",
}

# Fallback chain if primary model fails
FALLBACK_CHAIN = [
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]


def resolve_model(model_key: str) -> str:
    """Resolve model key to full model identifier."""
    return MODELS.get(model_key, model_key)


class OpenRouterClient:
    BASE_URL = "https://openrouter.ai/api/v1"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": settings.APP_URL,
            "X-Title": "Oracle-PySpark-Converter",
            "Content-Type": "application/json",
        }

    async def stream_convert(
        self,
        messages: list[dict],
        model: str = "default",
    ) -> AsyncGenerator[str, None]:
        resolved_model = resolve_model(model)
        headers = self._get_headers()

        payload = {
            "model": resolved_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.1,
            "max_tokens": 4096,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise ValueError(f"OpenRouter API error {response.status_code}: {error_text.decode()}")

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            parsed = json.loads(data)
                            delta = parsed.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, IndexError, KeyError):
                            continue

            except httpx.TimeoutException:
                raise ValueError("LLM request timed out after 120 seconds. Try a simpler query or a faster model.")
            except httpx.ConnectError:
                raise ValueError("Cannot connect to OpenRouter API. Check your internet connection.")

    async def check_health(self) -> bool:
        """Check if OpenRouter API is reachable."""
        if not settings.OPENROUTER_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/models",
                    headers=self._get_headers(),
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def get_available_models(self) -> list[dict]:
        """Get list of available models from OpenRouter."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/models",
                    headers=self._get_headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("data", [])
        except Exception:
            pass
        return []


openrouter_client = OpenRouterClient()
