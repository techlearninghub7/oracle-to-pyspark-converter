import Editor from '@monaco-editor/react'
import { useConversionStore } from '../../stores/conversionStore'

const ORACLE_EXAMPLES: Record<string, string> = {
  select: `-- Oracle SELECT with common Oracle-specific functions
SELECT
  e.employee_id,
  e.first_name || ' ' || e.last_name AS full_name,
  NVL(e.salary, 0) AS salary,
  NVL2(e.commission_pct, 'Has Commission', 'No Commission') AS commission_status,
  TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date,
  DECODE(e.job_id, 'IT_PROG', 'Developer', 'SA_MAN', 'Sales Manager', 'Other') AS job_title,
  TRUNC(MONTHS_BETWEEN(SYSDATE, e.hire_date) / 12) AS years_employed
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE ROWNUM <= 100
  AND e.salary > 5000
ORDER BY e.salary DESC`,

  procedure: `-- Oracle Stored Procedure
CREATE OR REPLACE PROCEDURE calculate_bonus(
  p_dept_id   IN  NUMBER,
  p_fiscal_yr IN  NUMBER,
  p_result    OUT VARCHAR2
) AS
  v_avg_salary  NUMBER := 0;
  v_emp_count   NUMBER := 0;
  CURSOR c_emps IS
    SELECT employee_id, salary FROM employees
    WHERE department_id = p_dept_id;
BEGIN
  SELECT AVG(salary), COUNT(*)
  INTO v_avg_salary, v_emp_count
  FROM employees
  WHERE department_id = p_dept_id;

  FOR emp_rec IN c_emps LOOP
    IF emp_rec.salary < v_avg_salary THEN
      UPDATE employees
      SET salary = salary * 1.10
      WHERE employee_id = emp_rec.employee_id;
    END IF;
  END LOOP;

  COMMIT;
  p_result := 'Updated ' || v_emp_count || ' employees';
  DBMS_OUTPUT.PUT_LINE(p_result);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    p_result := 'No employees found for dept ' || p_dept_id;
    ROLLBACK;
  WHEN OTHERS THEN
    p_result := 'Error: ' || SQLERRM;
    ROLLBACK;
END calculate_bonus;`,

  view: `-- Oracle View
CREATE OR REPLACE VIEW employee_summary AS
SELECT
  e.employee_id,
  e.first_name || ' ' || e.last_name AS full_name,
  d.department_name,
  j.job_title,
  NVL(e.salary, 0) AS salary,
  NVL(e.commission_pct, 0) * NVL(e.salary, 0) AS commission,
  TO_CHAR(e.hire_date, 'DD-MON-YYYY') AS hire_date,
  CASE
    WHEN MONTHS_BETWEEN(SYSDATE, e.hire_date) / 12 >= 10 THEN 'Senior'
    WHEN MONTHS_BETWEEN(SYSDATE, e.hire_date) / 12 >= 5  THEN 'Mid-level'
    ELSE 'Junior'
  END AS seniority_level,
  RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS salary_rank
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN jobs j ON e.job_id = j.job_id
WHERE e.status = 'ACTIVE'`,

  dml: `-- Oracle MERGE (UPSERT)
MERGE INTO target_employees tgt
USING (
  SELECT employee_id, first_name, last_name, salary, department_id
  FROM source_employees
  WHERE updated_date > SYSDATE - 1
) src
ON (tgt.employee_id = src.employee_id)
WHEN MATCHED THEN
  UPDATE SET
    tgt.salary = NVL(src.salary, tgt.salary),
    tgt.department_id = src.department_id,
    tgt.last_updated = SYSDATE
WHEN NOT MATCHED THEN
  INSERT (employee_id, first_name, last_name, salary, department_id, created_at)
  VALUES (src.employee_id, src.first_name, src.last_name,
          NVL(src.salary, 0), src.department_id, SYSDATE)`,
}

export function SqlEditor() {
  const { inputSql, setInputSql, inputType, setInputType } = useConversionStore()

  const loadExample = (type: string) => {
    const example = ORACLE_EXAMPLES[type]
    if (example) {
      setInputSql(example)
      setInputType(type as any)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-text-muted text-xs font-mono ml-1">oracle_input.sql</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-muted text-xs mr-1">Examples:</span>
          {Object.keys(ORACLE_EXAMPLES).map((type) => (
            <button
              key={type}
              onClick={() => loadExample(type)}
              className="px-2 py-0.5 text-xs rounded bg-bg-surface hover:bg-bg-hover border border-bg-border text-text-secondary hover:text-text-primary transition-all font-mono capitalize"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="sql"
          language="sql"
          value={inputSql}
          onChange={(val) => setInputSql(val || '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
          beforeMount={(monaco) => {
            // Custom dark theme matching our design
            monaco.editor.defineTheme('oracle-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'keyword', foreground: 'f97316', fontStyle: 'bold' },
                { token: 'keyword.sql', foreground: 'f97316', fontStyle: 'bold' },
                { token: 'string', foreground: 'a3e635' },
                { token: 'comment', foreground: '4a4e66', fontStyle: 'italic' },
                { token: 'number', foreground: '60a5fa' },
                { token: 'operator', foreground: 'fb923c' },
                { token: 'identifier', foreground: 'e2e8f0' },
              ],
              colors: {
                'editor.background': '#0f1117',
                'editor.foreground': '#e8eaf0',
                'editor.lineHighlightBackground': '#161820',
                'editor.selectionBackground': '#f9731620',
                'editor.inactiveSelectionBackground': '#f9731610',
                'editorLineNumber.foreground': '#2a2d3e',
                'editorLineNumber.activeForeground': '#4a4e66',
                'editorGutter.background': '#0f1117',
                'editor.findMatchBackground': '#f9731630',
                'editorWidget.background': '#161820',
                'editorSuggestWidget.background': '#161820',
                'editorSuggestWidget.border': '#1e2130',
              },
            })
            monaco.editor.setTheme('oracle-dark')
          }}
        />
      </div>
    </div>
  )
}
