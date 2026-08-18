/**
 * HistoryPage — displays query history for the authenticated user.
 * - Mock mode: shows mock history data without API calls.
 * - Real mode: Employees see their own queries; Admins see all org queries.
 * - Paginated with limit/offset.
 */
import { useState, useEffect } from "react";
import { Clock, Database, ChevronLeft, ChevronRight } from "lucide-react";
import Layout       from "../components/Layout";
import Spinner      from "../components/Spinner";
import SearchBar    from "../components/SearchBar";
import { historyAPI, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { mockQueryHistory } from "../data/mockData";

const PAGE_SIZE = 20;
const MOCK_MODE = import.meta.env.VITE_MOCK_AUTH === "true";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HistoryItemCard({ item, expanded, onToggle }) {
  return (
    <div
      className="history-item"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      aria-expanded={expanded}
    >
      {/* Question + meta */}
      <div className="history-question">{item.question}</div>
      <div className="history-meta">
        <span>
          <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
          {formatDate(item.created_at)}
        </span>
        {item.chart_type && item.chart_type !== "none" && (
          <span className="badge badge-info">📊 {item.chart_type}</span>
        )}
      </div>

      {/* SQL preview (always visible) */}
      {item.sql_query && (
        <div className="history-sql-preview">{item.sql_query}</div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: "12px" }}>
          {item.sql_explanation && (
            <div className="sql-explanation" style={{ marginBottom: "8px" }}>
              💡 {item.sql_explanation}
            </div>
          )}
          {item.answer_text && (
            <p style={{ fontSize: "13px", color: "var(--text-body)", marginTop: "8px" }}>
              🤖 {item.answer_text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { toast }  = useToast();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [page,     setPage]     = useState(0);
  const [hasMore,  setHasMore]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    if (MOCK_MODE) {
      // Use mock data
      setTimeout(() => {
        setItems(mockQueryHistory);
        setHasMore(false);
        setLoading(false);
      }, 300);
      return;
    }

    let cancelled = false;

    historyAPI.list(PAGE_SIZE, page * PAGE_SIZE)
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = getErrorMessage(err);
        setError(msg);
        setLoading(false);
        toast.error(msg);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function goToPage(next) {
    setLoading(true);
    setError("");
    setPage(next);
  }

  function toggleExpand(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  const filteredItems = search
    ? items.filter(
        (item) =>
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          (item.sql_query && item.sql_query.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Query History</h2>
            <p className="page-subtitle">Your past natural-language queries and results.</p>
          </div>
        </div>

        <div className="page-body">
          {/* Search */}
          {!loading && items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SearchBar
                id="history-search"
                value={search}
                onChange={setSearch}
                placeholder="Search history…"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "16px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
              <Spinner size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Database size={48} />
              </div>
              <h3>{search ? "No results found" : "No history yet"}</h3>
              <p>
                {search
                  ? "Try a different search term."
                  : "Start asking questions in the chat to build your history."}
              </p>
            </div>
          ) : (
            <>
              <div className="history-list">
                {filteredItems.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={item}
                    expanded={expanded === item.id}
                    onToggle={() => toggleExpand(item.id)}
                  />
                ))}
              </div>

              {/* Pagination (only in real mode) */}
              {!MOCK_MODE && (
                <div className="pagination">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => goToPage(Math.max(0, page - 1))}
                    disabled={page === 0 || loading}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="pagination-info">Page {page + 1}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={!hasMore || loading}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
