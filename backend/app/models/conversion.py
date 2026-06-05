from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ConversionOptions(BaseModel):
    include_explanation: bool = True
    add_type_hints: bool = True
    add_error_handling: bool = False
    include_imports: bool = True


class ConversionRequest(BaseModel):
    sql: str = Field(..., min_length=1, max_length=50000)
    input_type: str = Field(default="auto", description="auto/select/dml/view/procedure/function/package/trigger/sequence")
    target_format: str = Field(default="pyspark_sql", description="pyspark_sql/dataframe/script/databricks")
    model: str = Field(default="default")
    options: ConversionOptions = Field(default_factory=ConversionOptions)


class ConversionSummary(BaseModel):
    id: str
    created_at: str
    input_type: str
    target_fmt: str
    model_used: str
    status: str
    token_count: int
    latency_ms: int
    preview: Optional[str] = None


class ConversionDetail(ConversionSummary):
    input_sql: str
    output_code: Optional[str]
    explanation: Optional[str]
    error_msg: Optional[str]


class HistoryResponse(BaseModel):
    conversions: List[ConversionSummary]
    total: int


class FeedbackRequest(BaseModel):
    conversion_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    openrouter: str
    db: str
    version: str
    environment: str
