import re
from dataclasses import dataclass, field
from typing import List, Optional

try:
    import sqlglot
    import sqlglot.expressions as exp
    SQLGLOT_AVAILABLE = True
except ImportError:
    SQLGLOT_AVAILABLE = False

from app.utils.oracle_patterns import (
    detect_oracle_constructs,
    detect_input_type,
    estimate_complexity,
    get_construct_descriptions,
)


@dataclass
class ParseResult:
    input_type: str
    constructs: List[str]
    construct_descriptions: List[str]
    complexity: str
    table_refs: List[str]
    line_count: int
    char_count: int
    detected_type_auto: bool = True
    parse_error: Optional[str] = None


class OracleSqlParser:
    """
    Parses Oracle SQL/PL/SQL and extracts structured context
    for prompt enrichment.
    """

    def parse(self, sql: str, input_type_hint: str = "auto") -> ParseResult:
        line_count = len(sql.splitlines())
        char_count = len(sql)

        # Detect input type
        if input_type_hint == "auto":
            input_type = detect_input_type(sql)
            detected_auto = True
        else:
            input_type = input_type_hint
            detected_auto = False

        # Detect Oracle-specific constructs via regex
        constructs = detect_oracle_constructs(sql)
        construct_descriptions = get_construct_descriptions(constructs)

        # Estimate complexity
        complexity = estimate_complexity(sql, constructs)

        # Extract table references
        table_refs = self._extract_tables(sql)

        return ParseResult(
            input_type=input_type,
            constructs=constructs,
            construct_descriptions=construct_descriptions,
            complexity=complexity,
            table_refs=table_refs,
            line_count=line_count,
            char_count=char_count,
            detected_type_auto=detected_auto,
        )

    def _extract_tables(self, sql: str) -> List[str]:
        """Extract referenced table/view names from SQL."""
        tables = set()

        # Pattern: FROM table_name or JOIN table_name
        patterns = [
            r'\bFROM\s+([a-zA-Z_][a-zA-Z0-9_$.]*)',
            r'\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_$.]*)',
            r'\bINTO\s+([a-zA-Z_][a-zA-Z0-9_$.]*)',
            r'\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_$.]*)',
            r'\bMERGE\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_$.]*)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, sql, re.IGNORECASE)
            for match in matches:
                # Filter out keywords
                if match.upper() not in {
                    'DUAL', 'SELECT', 'WHERE', 'AND', 'OR', 'NOT',
                    'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
                }:
                    tables.add(match.lower())

        return sorted(list(tables))[:20]  # Limit to 20 refs
