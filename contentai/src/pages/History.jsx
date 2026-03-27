import { useState, useEffect, useCallback } from "react";
import { IoTrashOutline, IoCopyOutline, IoCheckmarkOutline, IoSearchOutline, IoCalendarOutline, IoFilterOutline, IoReloadOutline, IoSyncOutline } from "react-icons/io5";;
import TopBar from "../components/TopBar";
import { getHistory, deleteFromHistory, clearHistory } from "../lib/history";
import { TOOLS } from "../lib/tools";
import ReactMarkdown from "react-markdown";

export default function History({ onToggleSidebar, session, onOpenProfile }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filterTool, setFilterTool] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (err) {
      console.error("[history]", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteFromHistory(id);
      setHistory(h => h.filter(x => x.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error("[delete]", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear all history? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearHistory();
      setHistory([]);
      setSelectedId(null);
    } catch (err) {
      console.error("[clear]", err);
    } finally {
      setClearing(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = history.filter(h => {
    const matchSearch = !search ||
      h.toolName?.toLowerCase().includes(search.toLowerCase()) ||
      h.output?.toLowerCase().includes(search.toLowerCase());
    const matchTool = filterTool === "all" || h.toolId === filterTool;
    return matchSearch && matchTool;
  });

  const selected = history.find(h => h.id === selectedId);
  const uniqueTools = [...new Map(history.map(h => [h.toolId, h])).values()]
    .map(h => ({ id: h.toolId, name: h.toolName }));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        onToggleSidebar={onToggleSidebar}
        title="History"
        subtitle={loading ? "Loading…" : `${history.length} generations saved`}
        session={session}
        onOpenProfile={onOpenProfile}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── List ── */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/5 overflow-hidden bg-ink-900">
          <div className="p-4 border-b border-white/5 flex flex-col gap-3">
            {/* IoSearchOutline */}
            <div className="relative">
              <IoSearchOutline size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="IoSearchOutline history…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-ink-700 border border-white/5 text-sm text-white/80 placeholder-white/20 focus:border-ember-500/30 transition-colors"
                style={{ outline: "none" }} />
            </div>
            {/* IoFilterOutline + Refresh */}
            <div className="flex items-center gap-2">
              <IoFilterOutline size={12} className="text-white/30 flex-shrink-0" />
              <select value={filterTool} onChange={e => setFilterTool(e.target.value)}
                className="flex-1 text-xs bg-ink-700 border border-white/5 rounded-lg px-2 py-1.5 text-white/60 focus:border-ember-500/30 transition-colors"
                style={{ outline: "none", background: "#1c1c2e" }}>
                <option value="all">All Tools</option>
                {uniqueTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={load} disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <IoSyncOutline size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2 flex flex-col gap-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <IoReloadOutline size={20} className="text-white/20 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-white/20 gap-2 p-6">
                <IoCalendarOutline size={28} className="opacity-40" />
                <p className="text-sm">
                  {history.length === 0 ? "No history yet. Start generating!" : "No results found."}
                </p>
              </div>
            ) : (
              filtered.map(item => {
                const tool = TOOLS.find(t => t.id === item.toolId);
                return (
                  <div key={item.id}
                    onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                    className={`w-full cursor-pointer text-left flex items-start gap-3 p-3 rounded-xl border transition-all group ${
                      item.id === selectedId
                        ? "border-ember-500/40 bg-ember-500/8"
                        : "border-white/5 bg-ink-800 hover:border-white/10"
                    }`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{tool?.icon || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${item.id === selectedId ? "text-ember-300" : "text-white/80"}`}>
                        {item.toolName}
                      </p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{item.output?.slice(0, 70)}…</p>
                      <p className="text-xs text-white/20 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={e => handleDelete(item.id, e)}
                      disabled={deleting === item.id}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                      {deleting === item.id
                        ? <IoReloadOutline size={12} className="animate-spin" />
                        : <IoTrashOutline size={12} />
                      }
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {history.length > 0 && (
            <div className="p-3 border-t border-white/5">
              <button
                onClick={handleClear}
                disabled={clearing}
                className="w-full flex items-center justify-center gap-2 text-xs text-white/30 hover:text-red-400 py-2 rounded-lg hover:bg-red-400/10 transition-all">
                {clearing ? <IoReloadOutline size={11} className="animate-spin" /> : <IoTrashOutline size={11} />}
                {clearing ? "Clearing…" : "Clear All History"}
              </button>
            </div>
          )}
        </div>

        {/* ── Detail ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white/20 gap-3">
              <IoCalendarOutline size={32} className="opacity-30" />
              <p className="text-sm">Select an item to view its output</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TOOLS.find(t => t.id === selected.toolId)?.icon || "📄"}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{selected.toolName}</p>
                    <p className="text-xs text-white/30">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => handleDelete(selected.id, { stopPropagation: () => {} })}
                    disabled={deleting === selected.id}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-400/10 transition-all">
                    {deleting === selected.id ? <IoReloadOutline size={13} className="animate-spin" /> : <IoTrashOutline size={13} />}
                    Delete
                  </button>
                  <button onClick={() => handleCopy(selected.output)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={copied
                      ? { background: "rgba(63,255,162,0.12)", color: "#3fffa2" }
                      : { background: "rgba(255,107,53,0.12)", color: "#ff6b35" }}>
                    {copied ? <><IoCheckmarkOutline size={13} /> Copied!</> : <><IoCopyOutline size={13} /> IoCopyOutline</>}
                  </button>
                </div>
              </div>

              {/* Fields used */}
              {selected.fields && Object.keys(selected.fields).length > 0 && (
                <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-2">
                  {Object.entries(selected.fields).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/40">
                      <span className="text-white/25">{k}: </span>{v}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-auto p-6 animate-fade-in">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-display font-bold text-white mt-6 mb-3 leading-tight">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-display font-bold text-white/90 mt-5 mb-2.5 leading-tight">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-display font-semibold text-white/85 mt-4 mb-2">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-sm font-semibold text-white/80 mt-3 mb-1.5 uppercase tracking-wide">{children}</h4>,
                    p: ({ children }) => <p className="text-sm text-white/75 leading-7 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>{children}</p>,
                    ul: ({ children }) => <ul className="space-y-1.5 mb-4 ml-1">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-1.5 mb-4 ml-1 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => (
                      <li className="flex items-start gap-2.5 text-sm text-white/75 leading-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-ember-400 flex-shrink-0 mt-2" />
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic text-white/60">{children}</em>,
                    code: ({ inline, children }) => inline
                      ? <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,107,53,0.12)", color: "#ff6b35" }}>{children}</code>
                      : <pre className="rounded-xl p-4 mb-4 overflow-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}><code className="text-xs font-mono text-white/70 leading-6">{children}</code></pre>,
                    blockquote: ({ children }) => (
                      <blockquote className="pl-4 my-3 italic text-white/50 text-sm leading-6" style={{ borderLeft: "3px solid #ff6b35" }}>{children}</blockquote>
                    ),
                    hr: () => <hr className="my-5 border-white/8" />,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-ember-400 underline underline-offset-2 hover:text-ember-300 transition-colors">{children}</a>,
                  }}
                >
                  {selected.output}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
