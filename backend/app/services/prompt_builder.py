from app.services.sql_parser import ParseResult
from app.models.conversion import ConversionOptions


SYSTEM_PROMPT = """You are an expert Oracle SQL and PySpark developer specializing in database migration from Oracle to Apache Spark / Databricks.

Your task is to convert Oracle SQL/PL/SQL code to PySpark code accurately and completely.

STRICT RULES:
1. Output ONLY valid, runnable PySpark code inside a ```python code block.
2. After the code block, provide a brief explanation section (outside the code block) summarizing key conversion decisions using "Oracle construct → PySpark equivalent" format.
3. Replace ALL Oracle-specific functions, syntax, and constructs with PySpark equivalents.
4. Add inline comments for non-obvious conversions (e.g., # Oracle: NVL(x,0) → coalesce).
5. Include all required imports at the top of the code block.
6. Preserve the original business logic exactly — do not add or remove logic.
7. If a direct conversion is impossible (e.g., AUTONOMOUS_TRANSACTION), add a clear # TODO comment explaining why and what manual steps are needed.
8. Do NOT include any Oracle SQL syntax in the final output code.
9. Use PySpark DataFrame API where possible; fall back to spark.sql() for complex SQL that is cleaner as SQL strings.
10. For PySpark SQL strings, use triple-quoted strings for readability."""


TARGET_FORMAT_DESCRIPTIONS = {
    "pyspark_sql": "PySpark SQL using spark.sql('...') with triple-quoted SQL strings. Convert Oracle SQL to Spark SQL dialect.",
    "dataframe": "PySpark DataFrame API using fluent chain: spark.table().select().filter().join() etc. Use F.col(), F.when(), F.coalesce() etc.",
    "script": "Complete standalone PySpark Python script with SparkSession initialization, imports, and the converted logic as a function.",
    "databricks": "Databricks notebook cell format. Assume SparkSession 'spark' already exists. Add # COMMAND ---------- cell separators if multiple cells are needed.",
}

INPUT_TYPE_DESCRIPTIONS = {
    "select": "Oracle SQL SELECT query",
    "dml": "Oracle DML statement (INSERT/UPDATE/DELETE/MERGE)",
    "view": "Oracle CREATE VIEW definition",
    "procedure": "Oracle stored procedure (PL/SQL)",
    "function": "Oracle scalar or table function (PL/SQL)",
    "package": "Oracle PL/SQL package (spec and/or body)",
    "trigger": "Oracle database trigger",
    "sequence": "Oracle SEQUENCE definition",
    "plsql_block": "Anonymous PL/SQL DECLARE/BEGIN/END block",
}

FEW_SHOT_EXAMPLES = {
    "select": """
### Reference Example:
Oracle input:
```sql
SELECT e.emp_id, e.emp_name, NVL(e.salary, 0) AS salary,
       TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date
FROM employees e
WHERE ROWNUM <= 10
ORDER BY e.salary DESC
```

PySpark DataFrame API output:
```python
from pyspark.sql.functions import coalesce, lit, date_format, col

result_df = (
    spark.table("employees")
    .select(
        col("emp_id"),
        col("emp_name"),
        coalesce(col("salary"), lit(0)).alias("salary"),  # Oracle: NVL(salary, 0)
        date_format(col("hire_date"), "yyyy-MM-dd").alias("hire_date"),  # Oracle: TO_CHAR
    )
    .orderBy(col("salary").desc())
    .limit(10)  # Oracle: ROWNUM <= 10
)

result_df.show()
```
""",
    "procedure": """
### Reference Example (PL/SQL procedure → PySpark function):
Oracle input:
```sql
CREATE OR REPLACE PROCEDURE update_salaries(p_dept_id IN NUMBER, p_pct IN NUMBER) AS
BEGIN
  UPDATE employees SET salary = salary * (1 + p_pct/100) WHERE dept_id = p_dept_id;
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    ROLLBACK;
END;
```

PySpark output:
```python
from pyspark.sql.functions import col

def update_salaries(spark, p_dept_id: int, p_pct: float) -> None:
    \"\"\"Update employee salaries for a department by a percentage.\"\"\"
    try:
        employees_df = spark.table("employees")
        updated_df = employees_df.withColumn(
            "salary",
            # Oracle: salary * (1 + p_pct/100)
            when(col("dept_id") == p_dept_id,
                 col("salary") * (1 + p_pct / 100))
            .otherwise(col("salary"))
        )
        # Note: Spark uses overwrite mode instead of UPDATE + COMMIT
        updated_df.write.mode("overwrite").saveAsTable("employees")
    except Exception as e:
        print(f"Error: {e}")  # Oracle: DBMS_OUTPUT.PUT_LINE
        raise  # Oracle: ROLLBACK equivalent - re-raise for caller to handle
```
""",
}

CHAIN_OF_THOUGHT_INSTRUCTION = """
This is a complex PL/SQL construct. Please follow these steps carefully:

Step 1: Identify the procedure/function/package purpose, inputs, outputs, and side effects.
Step 2: Map each PL/SQL block structure (DECLARE section, cursors, loops, exception handlers) to its PySpark equivalent pattern.
Step 3: Identify any Oracle constructs that have no direct equivalent and plan the workaround.
Step 4: Write the complete, runnable PySpark code.
Step 5: After the code block, provide a summary of all key conversion decisions made.
"""


class PromptBuilder:
    def build_messages(
        self,
        sql: str,
        parse_result: ParseResult,
        target_format: str,
        options: ConversionOptions,
    ) -> list[dict]:
        user_prompt = self._build_user_prompt(sql, parse_result, target_format, options)
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def _build_user_prompt(
        self,
        sql: str,
        parse_result: ParseResult,
        target_format: str,
        options: ConversionOptions,
    ) -> str:
        parts = []

        # Header
        input_desc = INPUT_TYPE_DESCRIPTIONS.get(parse_result.input_type, parse_result.input_type)
        target_desc = TARGET_FORMAT_DESCRIPTIONS.get(target_format, target_format)

        parts.append(f"Convert the following {input_desc} to PySpark.")
        parts.append(f"\n**Target output format:** {target_desc}")

        # Detected constructs
        if parse_result.constructs:
            parts.append("\n**Detected Oracle constructs to handle:**")
            for desc in parse_result.construct_descriptions[:15]:
                parts.append(f"- {desc}")

        # Options
        option_notes = []
        if options.include_imports:
            option_notes.append("Include all necessary PySpark imports")
        if options.add_type_hints:
            option_notes.append("Add Python type hints to function signatures")
        if options.add_error_handling:
            option_notes.append("Add proper try/except error handling")
        if options.include_explanation:
            option_notes.append("After the code block, add an Explanation section with conversion decisions")
        if option_notes:
            parts.append("\n**Requirements:** " + "; ".join(option_notes))

        # Few-shot example for medium complexity
        if parse_result.complexity == "medium":
            example_key = parse_result.input_type if parse_result.input_type in FEW_SHOT_EXAMPLES else "select"
            if example_key in FEW_SHOT_EXAMPLES:
                parts.append(FEW_SHOT_EXAMPLES[example_key])

        # Chain of thought for high complexity
        if parse_result.complexity == "high":
            parts.append(CHAIN_OF_THOUGHT_INSTRUCTION)

        # The SQL itself
        parts.append(f"\n**Oracle SQL to convert:**")
        parts.append(f"```sql\n{sql}\n```")

        return "\n".join(parts)
