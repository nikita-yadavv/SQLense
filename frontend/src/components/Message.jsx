/**
 * Message — renders a single chat message bubble.
 * Handles both user messages and rich bot responses
 * (answer text, SQL, SQL explanation, charts with toggle/save, result table).
 */
import { useState } from "react";
import { BarChart2, Bookmark, Check, Eye, EyeOff } from "lucide-react";
import ChartRenderer from "./ChartRenderer";
import ResultTable   from "./ResultTable";
import { savedChartsAPI, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Message({
  type,
  text,
  sql,
  sqlExplanation,
  answerText,
  chart,
  rows,
  columns,
  userQuestion,
}) {
  const { toast } = useToast();
  const [showChart, setShowChart] = useState(true);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);

  if (type === "user") {
    return (
      <div className="message-wrapper user">
        <div className="user-message">{text}</div>
      </div>
    );
  }

  const hasChart = chart && chart.type && chart.type !== "none" && chart.type !== "table" && chart.data?.length > 0;

  async function handleSaveChart() {
    if (!hasChart || saved || saving) return;
    setSaving(true);
    try {
      await savedChartsAPI.save({
        title: chart.title || userQuestion || "Chart Visualization",
        question: userQuestion || text || "AI Chat Query",
        sql_query: sql || "",
        chart_type: chart.type,
        chart_data: chart.data,
      });
      setSaved(true);
      toast.success("Chart saved to Saved Charts!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="message-wrapper bot">
      <div className="bot-message">
        {/* Business insight / answer text */}
        {(answerText || text) && (
          <p className="answer-text">🤖 {answerText || text}</p>
        )}

        {/* SQL Explanation */}
        {sqlExplanation && (
          <div className="sql-explanation">
            💡 {sqlExplanation}
          </div>
        )}

        {/* Generated SQL */}
        {sql && (
          <div className="sql-box">
            <div className="sql-box-header">
              <h4>Generated SQL</h4>
            </div>
            <pre>{sql}</pre>
          </div>
        )}

        {/* Action Controls for Chart */}
        {hasChart && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 12, marginBottom: 8, padding: "6px 12px", borderRadius: 8,
            background: "var(--surface-elevated, rgba(255,255,255,0.04))", border: "1px solid var(--border)",
          }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowChart((v) => !v)}
              id="toggle-chart-btn"
            >
              {showChart ? <EyeOff size={13} /> : <Eye size={13} />}
              {showChart ? "Hide Chart" : "Show Chart"}
            </button>

            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={handleSaveChart}
              disabled={saved || saving}
              id="save-chart-btn"
            >
              {saved ? <Check size={13} /> : <Bookmark size={13} />}
              {saved ? "Saved" : saving ? "Saving…" : "Save Chart"}
            </button>
          </div>
        )}

        {/* Chart (bar / line / pie) */}
        {hasChart && showChart && (
          <ChartRenderer chart={chart} />
        )}

        {/* Result table */}
        {rows && columns && rows.length > 0 && (
          <ResultTable rows={rows} columns={columns} />
        )}
      </div>
    </div>
  );
}