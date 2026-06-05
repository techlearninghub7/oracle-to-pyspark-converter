# Oracle → PySpark Converter

> AI-powered tool to convert Oracle SQL, PL/SQL, Views, Stored Procedures, Packages & Triggers to PySpark code — powered by OpenRouter LLMs with real-time streaming.

![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20Monaco-orange)
![LLM](https://img.shields.io/badge/LLM-OpenRouter%20(Claude%2FLlama%2FMistral)-blue)
![Deploy](https://img.shields.io/badge/deploy-Render%20Free%20Tier-green)

---

## Features

- **Real-time streaming** — watch PySpark code generate token by token via SSE
- **Smart Oracle parsing** — detects ROWNUM, NVL, DECODE, CONNECT BY, cursors, BULK COLLECT, and 40+ Oracle constructs
- **Multiple input types** — SELECT, DML, Views, Stored Procedures, Functions, Packages, Triggers, PL/SQL Blocks
- **Multiple output formats** — PySpark SQL, DataFrame API, Full Script, Databricks Notebook
- **Model selection** — Claude 3 Haiku, Llama 3.1 (free), Mistral 7B (free), Claude 3.5 Sonnet, DeepSeek Coder
- **Conversion history** — SQLite-backed history with reload, delete, and filter
- **World-class UI** — Monaco editors, dark industrial theme, resizable panes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript 5 |
| UI | Tailwind CSS v3 + Radix UI + ShadCN |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| State | Zustand |
| Backend | FastAPI 0.115 + Python 3.12 |
| SQL Parser | sqlglot 25 |
| LLM | OpenRouter (Claude / Llama / Mistral / DeepSeek) |
| Database | SQLite via aiosqlite |
| Streaming | SSE (Server-Sent Events) |
| Deploy | Render Free Tier |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenRouter API key — get free at [openrouter.ai](https://openrouter.ai)

### 1. Clone
```bash
git clone https://github.com/your-org/oracle-to-pyspark
cd oracle-to-pyspark
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set: OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx

uvicorn main:app --reload --port 8000
# API docs at: http://localhost:8000/docs
# Health check: http://localhost:8000/api/health
```

### 3. Frontend setup (new terminal)
```bash
cd frontend
npm install
cp .env.example .env.local
# VITE_API_BASE_URL is empty for local (Vite proxy handles it)

npm run dev
# App at: http://localhost:5173
```

---

## Deployment on Render (Free Tier)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/oracle-to-pyspark
git push -u origin main
```

### Step 2 — Create Render account
Sign up at [render.com](https://render.com) (free)

### Step 3 — Connect repo
1. Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` and creates both services

### Step 4 — Add API key secret
In Render Dashboard → `oracle-pyspark-backend` service → **Environment**:
```
OPENROUTER_API_KEY = sk-or-v1-xxxxxxxxxxxxxxxx
```

### Step 5 — Deploy
Click **Manual Deploy** → **Deploy latest commit**

**URLs after deploy:**
- Frontend: `https://oracle-pyspark-frontend.onrender.com`
- Backend API: `https://oracle-pyspark-backend.onrender.com`
- API Docs: `https://oracle-pyspark-backend.onrender.com/docs`

> **Note:** Render free tier has cold starts (~30s wake-up). First request after inactivity may be slow.

---

## API Reference

### `POST /api/convert` — Convert Oracle SQL (SSE Stream)
```json
{
  "sql": "SELECT NVL(salary,0) FROM emp WHERE ROWNUM <= 10",
  "input_type": "auto",
  "target_format": "dataframe",
  "model": "default",
  "options": {
    "include_explanation": true,
    "add_type_hints": true,
    "add_error_handling": false,
    "include_imports": true
  }
}
```

SSE stream events:
```
data: {"type":"parse_info","input_type":"select","complexity":"low","constructs":["rownum","nvl"]}
data: {"type":"token","content":"from pyspark"}
data: {"type":"done","conversion_id":"abc123","token_count":342,"latency_ms":1850}
data: {"type":"error","message":"..."}
```

### `GET /api/history` — Get conversion history
### `GET /api/history/{id}` — Get full conversion detail
### `DELETE /api/history/{id}` — Delete a conversion
### `POST /api/feedback` — Rate a conversion (1–5 stars)
### `GET /api/health` — Health check
### `GET /api/models` — Available LLM models

---

## Supported Oracle Constructs

| Oracle | PySpark |
|---|---|
| `ROWNUM <= n` | `.limit(n)` |
| `NVL(x, y)` | `coalesce(col("x"), lit(y))` |
| `NVL2(x, a, b)` | `when(col("x").isNotNull(), a).otherwise(b)` |
| `DECODE(x, v1, r1, d)` | `when(...).otherwise(d)` |
| `TO_DATE(str, fmt)` | `to_date(col("str"), "fmt")` |
| `TO_CHAR(date, fmt)` | `date_format(col("date"), "fmt")` |
| `SYSDATE` | `current_date()` |
| `SYSTIMESTAMP` | `current_timestamp()` |
| `CONNECT BY PRIOR` | Recursive CTE + comment |
| `BULK COLLECT` | Full DataFrame operation |
| `CURSOR FOR LOOP` | `.collect()` / `.foreach()` |
| `DBMS_OUTPUT.PUT_LINE` | `print()` / `logging.info()` |
| `LISTAGG(col, sep)` | `concat_ws(sep, collect_list(col))` |
| `%ROWTYPE` | `StructType` definition |
| `MERGE INTO` | DataFrame join + write |

---

## Project Structure

```
oracle-to-pyspark/
├── render.yaml                    # Render deployment config
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py              # Settings
│       ├── database.py            # SQLite setup
│       ├── models/conversion.py   # Pydantic models
│       ├── routers/
│       │   ├── convert.py         # POST /api/convert (SSE)
│       │   ├── history.py         # GET /api/history
│       │   └── health.py          # GET /api/health
│       ├── services/
│       │   ├── sql_parser.py      # Oracle construct detection
│       │   ├── prompt_builder.py  # LLM prompt assembly
│       │   ├── llm_client.py      # OpenRouter streaming client
│       │   └── response_parser.py # Output cleaning
│       └── utils/
│           ├── oracle_patterns.py # 40+ Oracle regex patterns
│           └── pyspark_templates.py
└── frontend/
    ├── src/
    │   ├── App.tsx                # Main layout
    │   ├── components/
    │   │   ├── layout/Header.tsx
    │   │   ├── editor/SqlEditor.tsx      # Monaco SQL editor
    │   │   ├── editor/OutputViewer.tsx   # Monaco PySpark viewer
    │   │   ├── config/ConversionConfig.tsx
    │   │   └── history/ConversionHistory.tsx
    │   ├── hooks/useConversion.ts # SSE streaming hook
    │   ├── stores/conversionStore.ts # Zustand state
    │   └── services/api.ts
    └── ...config files
```

---

## License

MIT
