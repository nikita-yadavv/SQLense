/**
 * ResultTable — renders dynamic rows and columns from the backend response.
 * Accepts: rows (list of dicts) and columns (list of strings).
 * Replaces the old hardcoded placeholder.
 */
export default function ResultTable({ rows = [], columns = [] }) {
  if (!columns.length || !rows.length) return null;

  return (
    <div className="result-box">
      <div className="result-box-header">
        <h3>📊 Query Results</h3>
        <span className="result-count">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>
                    {row[col] === null || row[col] === undefined
                      ? <span style={{ color: "var(--text-muted)" }}>—</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}