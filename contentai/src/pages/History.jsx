import { useState, useEffect } from "react";
import { Trash2, Copy, Check, Search, Calendar, Filter, X } from "lucide-react";
import TopBar from "../components/TopBar";
import { getHistory, deleteFromHistory, clearHistory } from "../lib/history";
import { TOOLS } from "../lib/tools";

export default function History({ onToggleSidebar, session, onOpenProfile }) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filterTool, setFilterTool] = useState("all");
  const [showList, setShowList] = useState(false);

  useEffect(() => { setHistory(getHistory()); }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteFromHistory(id);
    setHistory(getHistory());
    if (selectedId === id) setSelectedId(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = history.filter(h => {
    const matchSearch = !search || h.toolName?.toLowerCase().includes(search.toLowerCase()) || h.output?.toLowerCase().includes(search.toLowerCase());
    const matchTool = filterTool === "all" || h.toolId === filterTool;
    return matchSearch && matchTool;
  });

  const selected = history.find(h => h.id === selectedId);
  const uniqueTools = [...new Set(history.map(h => h.toolId))].map(id => TOOLS.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar onToggleSidebar={onToggleSidebar} title="History" subtitle={`${history.length} generations saved`} session={session} onOpenProfile={onOpenProfile} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* List — Drawer on mobile ── */}
        <div className={`
          absolute inset-y-0 left-0 z-20 w-80 flex-shrink-0 flex flex-col border-r border-white/5 bg-ink-900 transition-all duration-300 lg:relative lg:translate-x-0
          ${showList ? "translate-x-0" : "-translate-x-full"}
          lg:flex flex-shrink-0
        `}>
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">History</span>
            <button onClick={() => setShowList(false)} className="text-white/30 hover:text-white/60">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 border-b border-white/5 flex flex-col gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search history..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-ink-700 border border-white/5 text-sm text-white/80 placeholder-white/20 focus:border-ember-500/30 transition-colors"
                style={{ background: "#1c1c2e" }} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-white/30 flex-shrink-0" />
              <select value={filterTool} onChange={e => setFilterTool(e.target.value)}
                className="flex-1 text-xs bg-ink-700 border border-white/5 rounded-lg px-2 py-1.5 text-white/60 focus:border-ember-500/30 transition-colors"
                style={{ background: "#1c1c2e" }}>
                <option value="all">All Tools</option>
                {uniqueTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2 flex flex-col gap-1.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-white/20 gap-2 p-6">
                <Calendar size={28} className="opacity-40" />
                <p className="text-sm">{history.length === 0 ? "No history yet. Start generating!" : "No results found."}</p>
              </div>
            ) : (
              filtered.map(item => {
                const tool = TOOLS.find(t => t.id === item.toolId);
                return (
                  <button key={item.id}
                    onClick={() => { setSelectedId(item.id === selectedId ? null : item.id); setShowList(false); }}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all group ${item.id === selectedId
                      ? "border-ember-500/40 bg-ember-500/8"
                      : "border-white/5 bg-ink-800 hover:border-white/10"}`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{tool?.icon || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${item.id === selectedId ? "text-ember-300" : "text-white/80"}`}>{item.toolName}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{item.output?.slice(0, 70)}...</p>
                      <p className="text-xs text-white/20 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={e => handleDelete(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </button>
                );
              })
            )}
          </div>

          {history.length > 0 && (
            <div className="p-3 border-t border-white/5">
              <button onClick={() => { clearHistory(); setHistory([]); setSelectedId(null); }}
                className="w-full text-xs text-white/30 hover:text-red-400 py-2 rounded-lg hover:bg-red-400/10 transition-all">
                Clear All History
              </button>
            </div>
          )}
        </div>

        {/* Mobile Backdrop */}
        {showList && (
          <div className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowList(false)} />
        )}

        {/* Detail */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white/20 gap-3">
              <Calendar size={32} className="opacity-30" />
              <p className="text-sm">Select an item to view its output</p>
              <button onClick={() => setShowList(true)} className="lg:hidden px-4 py-2 rounded-lg bg-ember-500/10 text-ember-400 border border-ember-500/20 text-xs font-semibold">
                View History
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TOOLS.find(t => t.id === selected.toolId)?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{selected.toolName}</p>
                    <p className="text-xs text-white/30">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowList(true)} className="lg:hidden px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/40">
                    List
                  </button>
                  <button onClick={() => handleDelete(selected.id, { stopPropagation: () => {} })}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-400/10 transition-all">
                    <Trash2 size={13} /> Delete
                  </button>
                  <button onClick={() => handleCopy(selected.output)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={copied ? { background: "rgba(63,255,162,0.12)", color: "#3fffa2" } : { background: "rgba(255,107,53,0.12)", color: "#ff6b35" }}>
                    {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
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

              <div className="flex-1 overflow-auto p-5">
                <pre className="font-mono text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{selected.output}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
