import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ParsedResponse:
    pyspark_code: str
    explanation: str
    missing_imports: List[str]
    is_valid: bool
    raw_response: str


# Common PySpark imports that should be present based on usage
IMPORT_CHECKS = [
    (r'\bSparkSession\b', "from pyspark.sql import SparkSession"),
    (r'\bWindow\b', "from pyspark.sql.window import Window"),
    (r'\bStructType\b|\bStructField\b', "from pyspark.sql.types import StructType, StructField"),
    (r'\brow_number\(\)|rank\(\)|dense_rank\(\)', "from pyspark.sql.functions import row_number  # (or rank/dense_rank)"),
]


class PySparkResponseParser:
    """
    Cleans and validates LLM-generated PySpark code.
    Extracts code blocks, removes markdown fences,
    and performs basic PySpark syntax validation.
    """

    def parse(self, raw: str) -> ParsedResponse:
        if not raw or not raw.strip():
            return ParsedResponse(
                pyspark_code="# No output received from LLM",
                explanation="",
                missing_imports=[],
                is_valid=False,
                raw_response=raw or "",
            )

        # Extract code block
        code = self._extract_code_block(raw)

        # Extract explanation (text outside code blocks)
        explanation = self._extract_explanation(raw)

        # Check for missing important imports
        missing_imports = self._check_imports(code)

        is_valid = bool(code and len(code.strip()) > 10)

        return ParsedResponse(
            pyspark_code=code,
            explanation=explanation,
            missing_imports=missing_imports,
            is_valid=is_valid,
            raw_response=raw,
        )

    def _extract_code_block(self, raw: str) -> str:
        """Extract Python code from markdown code fences."""
        # Try ```python first
        match = re.search(r'```python\s*\n(.*?)```', raw, re.DOTALL)
        if match:
            return match.group(1).strip()

        # Try ``` (generic)
        match = re.search(r'```\s*\n(.*?)```', raw, re.DOTALL)
        if match:
            return match.group(1).strip()

        # If no code fence found, try to detect if the whole response is code
        lines = raw.strip().split('\n')
        code_lines = []
        in_code_section = False

        for line in lines:
            if any(line.strip().startswith(kw) for kw in ['from ', 'import ', 'def ', 'class ', '#', 'spark', 'df']):
                in_code_section = True
            if in_code_section:
                code_lines.append(line)

        if code_lines and len(code_lines) > 3:
            return '\n'.join(code_lines).strip()

        # Return raw if we can't extract
        return raw.strip()

    def _extract_explanation(self, raw: str) -> str:
        """Extract explanation text outside of code blocks."""
        # Remove all code blocks
        cleaned = re.sub(r'```[\w]*\n.*?```', '', raw, flags=re.DOTALL)
        cleaned = cleaned.strip()

        # Remove leading/trailing dashes or markdown headers
        lines = [l for l in cleaned.split('\n') if l.strip() and not l.strip().startswith('---')]
        return '\n'.join(lines).strip()

    def _check_imports(self, code: str) -> List[str]:
        """Check for potentially missing imports."""
        missing = []
        for pattern, import_stmt in IMPORT_CHECKS:
            if re.search(pattern, code) and "import" not in code:
                missing.append(import_stmt)
        return missing
