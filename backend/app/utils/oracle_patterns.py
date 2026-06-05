import re
from typing import List, Dict


# Oracle-specific regex patterns for construct detection
ORACLE_PATTERNS: Dict[str, str] = {
    "rownum": r'\bROWNUM\b',
    "rowid": r'\bROWID\b',
    "connect_by": r'\bCONNECT\s+BY\b',
    "start_with": r'\bSTART\s+WITH\b',
    "nvl": r'\bNVL\s*\(',
    "nvl2": r'\bNVL2\s*\(',
    "decode": r'\bDECODE\s*\(',
    "sysdate": r'\bSYSDATE\b',
    "systimestamp": r'\bSYSTIMESTAMP\b',
    "dual": r'\bFROM\s+DUAL\b',
    "bulk_collect": r'\bBULK\s+COLLECT\b',
    "forall": r'\bFORALL\b',
    "cursor": r'\bCURSOR\s+\w+\b|\bOPEN\s+\w+\s+FOR\b',
    "exception_block": r'\bEXCEPTION\b',
    "dbms_output": r'\bDBMS_OUTPUT\b',
    "pragma": r'\bPRAGMA\b',
    "sequence_nextval": r'\w+\.NEXTVAL\b',
    "sequence_currval": r'\w+\.CURRVAL\b',
    "to_date": r'\bTO_DATE\s*\(',
    "to_char": r'\bTO_CHAR\s*\(',
    "to_number": r'\bTO_NUMBER\s*\(',
    "trunc_date": r'\bTRUNC\s*\(',
    "months_between": r'\bMONTHS_BETWEEN\s*\(',
    "add_months": r'\bADD_MONTHS\s*\(',
    "last_day": r'\bLAST_DAY\s*\(',
    "instr": r'\bINSTR\s*\(',
    "substr": r'\bSUBSTR\s*\(',
    "lpad": r'\bLPAD\s*\(',
    "rpad": r'\bRPAD\s*\(',
    "listagg": r'\bLISTAGG\s*\(',
    "wm_concat": r'\bWM_CONCAT\s*\(',
    "rowtype": r'%ROWTYPE\b',
    "type_attr": r'%TYPE\b',
    "execute_immediate": r'\bEXECUTE\s+IMMEDIATE\b',
    "autonomous_transaction": r'\bAUTONOMOUS_TRANSACTION\b',
    "savepoint": r'\bSAVEPOINT\b',
    "merge": r'\bMERGE\s+INTO\b',
    "varchar2": r'\bVARCHAR2\s*\(',
    "number_type": r'\bNUMBER\s*[\(,\s]',
    "clob": r'\bCLOB\b',
    "blob": r'\bBLOB\b',
    "xmltype": r'\bXMLTYPE\b',
    "pipe_row": r'\bPIPE\s+ROW\b',
    "pipelined": r'\bPIPELINED\b',
    "package_spec": r'\bCREATE\s+(OR\s+REPLACE\s+)?PACKAGE\s+\w+\s*\n',
    "package_body": r'\bCREATE\s+(OR\s+REPLACE\s+)?PACKAGE\s+BODY\b',
    "trigger": r'\bCREATE\s+(OR\s+REPLACE\s+)?TRIGGER\b',
}


def detect_oracle_constructs(sql: str) -> List[str]:
    """Detect Oracle-specific constructs in the SQL text."""
    found = []
    for name, pattern in ORACLE_PATTERNS.items():
        if re.search(pattern, sql, re.IGNORECASE):
            found.append(name)
    return found


def detect_input_type(sql: str) -> str:
    """Auto-detect the type of Oracle SQL/PL/SQL input."""
    sql_upper = sql.strip().upper()

    # Remove leading comments
    sql_clean = re.sub(r'/\*.*?\*/', '', sql_upper, flags=re.DOTALL)
    sql_clean = re.sub(r'--[^\n]*', '', sql_clean)
    sql_clean = sql_clean.strip()

    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?PACKAGE\s+BODY\b', sql_clean):
        return "package"
    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?PACKAGE\b', sql_clean):
        return "package"
    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?TRIGGER\b', sql_clean):
        return "trigger"
    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\b', sql_clean):
        return "procedure"
    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b', sql_clean):
        return "function"
    if re.search(r'\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\b', sql_clean):
        return "view"
    if re.search(r'\bCREATE\s+SEQUENCE\b', sql_clean):
        return "sequence"
    if re.search(r'\bMERGE\s+INTO\b', sql_clean):
        return "dml"
    if re.search(r'^\s*(INSERT|UPDATE|DELETE)\b', sql_clean):
        return "dml"
    if re.search(r'\bDECLARE\b|\bBEGIN\b', sql_clean):
        return "plsql_block"
    if re.search(r'^\s*SELECT\b', sql_clean):
        return "select"
    if re.search(r'\bWITH\s+\w+\s+AS\b', sql_clean):
        return "select"

    return "select"


def estimate_complexity(sql: str, constructs: List[str]) -> str:
    """Estimate conversion complexity."""
    high_complexity_constructs = {
        "connect_by", "bulk_collect", "forall", "cursor", "execute_immediate",
        "autonomous_transaction", "pipe_row", "pipelined", "package_spec",
        "package_body", "trigger", "rowtype", "type_attr"
    }
    medium_complexity_constructs = {
        "decode", "rownum", "listagg", "merge", "exception_block",
        "sequence_nextval", "pragma", "dbms_output"
    }

    line_count = len(sql.splitlines())

    if any(c in high_complexity_constructs for c in constructs) or line_count > 100:
        return "high"
    if any(c in medium_complexity_constructs for c in constructs) or line_count > 30:
        return "medium"
    return "low"


# Human-readable construct descriptions for prompts
CONSTRUCT_DESCRIPTIONS: Dict[str, str] = {
    "rownum": "ROWNUM pseudo-column (use LIMIT or ROW_NUMBER() window function)",
    "connect_by": "CONNECT BY PRIOR hierarchical query (use recursive CTE or iterative approach)",
    "nvl": "NVL() null replacement (use coalesce())",
    "nvl2": "NVL2() conditional null (use when().otherwise())",
    "decode": "DECODE() conditional (use CASE WHEN or when().otherwise())",
    "sysdate": "SYSDATE (use current_date())",
    "systimestamp": "SYSTIMESTAMP (use current_timestamp())",
    "dual": "DUAL table (use inline SELECT or remove)",
    "bulk_collect": "BULK COLLECT (use full DataFrame operation)",
    "forall": "FORALL (use vectorized DataFrame operation)",
    "cursor": "Cursor/loop (use DataFrame collect() or foreach())",
    "exception_block": "EXCEPTION block (use try/except with isEmpty() checks)",
    "dbms_output": "DBMS_OUTPUT (use print() or logging)",
    "sequence_nextval": "Sequence NEXTVAL (use monotonically_increasing_id() or comment)",
    "to_date": "TO_DATE() (use to_date() PySpark function)",
    "to_char": "TO_CHAR() (use date_format() for dates, cast for numbers)",
    "merge": "MERGE INTO (use PySpark DataFrame merge/join operations)",
    "execute_immediate": "EXECUTE IMMEDIATE dynamic SQL (requires manual conversion)",
    "rowtype": "%ROWTYPE (define StructType schema)",
    "type_attr": "%TYPE (use inferred type with comment)",
    "listagg": "LISTAGG() (use concat_ws + collect_list)",
}


def get_construct_descriptions(constructs: List[str]) -> List[str]:
    return [CONSTRUCT_DESCRIPTIONS[c] for c in constructs if c in CONSTRUCT_DESCRIPTIONS]
