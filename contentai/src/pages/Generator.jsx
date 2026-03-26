import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Wand2, Copy, Check, Download, RefreshCw, ChevronDown,
  AlertCircle, BookOpen, X, ChevronUp, Database, Square
} from "lucide-react";
import TopBar from "../components/TopBar";
import { TOOLS, CATEGORIES } from "../lib/tools";
import { generateContent } from "../lib/api";
import { saveToHistory, incrementUsage } from "../lib/history";
import { getProjects } from "../lib/projects";
import ReactMarkdown from "react-markdown";

// ── Field input component ─────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  const base = "w-full bg-ink-700 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:border-ember-500/50 transition-colors";
  if (field.type === "select") {
    return (
      <div className="relative">
        <select value={value || ""} onChange={e => onChange(e.target.value)}
          className={`${base} appearance-none pr-8 cursor-pointer`}
          style={{ background: "#1c1c2e" }}>
          <option value="">Select {field.label}</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder} rows={3}
        className={`${base} resize-none`}
        style={{ background: "#1c1c2e" }} />
    );
  }
  return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
      style={{ background: "#1c1c2e" }} />
  );
}

// ── RAG Project Selector ──────────────────────────────────────
function RagSelector({ projects, selectedProjectId, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-all hover:bg-white/3"
        style={{ background: selectedProjectId ? "rgba(255,107,53,0.07)" : "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2.5">
          <Database size={13} className={selectedProjectId ? "text-ember-400" : "text-white/25"} />
          <div>
            <p className="text-xs font-semibold text-white/60">Knowledge Base</p>
            <p className="text-xs text-white/35 mt-0.5">
              {selected ? selected.name : "No project selected — standard generation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedProjectId && (
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-white/60 hover:bg-white/10 transition-all">
              <X size={11} />
            </button>
          )}
          {open ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border-t border-white/5">
          {projects.length === 0 ? (
            <div className="px-3.5 py-4 text-center">
              <BookOpen size={16} className="text-white/15 mx-auto mb-2" />
              <p className="text-xs text-white/30">No knowledge bases yet.</p>
              <p className="text-xs text-white/20 mt-0.5">
                Create one in the <span className="text-ember-400/70">Knowledge Base</span> page.
              </p>
            </div>
          ) : (
            <div className="p-1.5 flex flex-col gap-1">
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                  !selectedProjectId ? "bg-white/8 text-white/70" : "text-white/35 hover:bg-white/5 hover:text-white/60"
                }`}>
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Wand2 size={10} className="text-white/30" />
                </span>
                None — standard generation
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    selectedProjectId === p.id
                      ? "bg-ember-500/15 text-ember-300"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}>
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: selectedProjectId === p.id ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.06)" }}>
                    <BookOpen size={10} className={selectedProjectId === p.id ? "text-ember-400" : "text-white/30"} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-xs opacity-50">{p.sourceCount || 0} source{p.sourceCount !== 1 ? "s" : ""}</p>
                  </div>
                  {selectedProjectId === p.id && <Check size={11} className="text-ember-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Generator page ───────────────────────────────────────
export default function Generator({ onToggleSidebar, session, onOpenProfile }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState(null);
  const [fields, setFields] = useState({});
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [warming, setWarming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [ragUsed, setRagUsed] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const outputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // RAG
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    getProjects().then(d => setProjects(d.projects || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const toolId = searchParams.get("tool");
    if (toolId) {
      const tool = TOOLS.find(t => t.id === toolId);
      if (tool) { setSelectedTool(tool); setFields({}); setOutput(""); setRagUsed(false); setHasGenerated(false); }
    }
  }, [searchParams]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const handleGenerate = async () => {
    if (!selectedTool) return;
    const requiredField = selectedTool.fields[0];
    if (!fields[requiredField.key]?.trim()) {
      setError(`Please fill in "${requiredField.label}" to continue.`);
      return;
    }
    setError("");
    setStreaming(true);
    setOutput("");
    setRagUsed(false);

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const warmingTimer = setTimeout(() => {
      setWarming(true);
    }, 6000);

    try {
      const systemPrompt = selectedTool.systemPrompt(fields);
      const userMessage = "Generate the content now based on the provided details. Be thorough, creative, and professional.";

      const result = await generateContent(
        systemPrompt,
        userMessage,
        (text) => {
          clearTimeout(warmingTimer);
          setWarming(false);
          setOutput(text);
        },
        selectedProjectId || null,
        (used) => setRagUsed(used),
        controller.signal
      );

      incrementUsage();
      await saveToHistory({ toolId: selectedTool.id, toolName: selectedTool.name, fields, output: result });
      setHasGenerated(true);
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Generation cancelled by user.");
      } else {
        const msg = err.message || "";
        if (msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
          setError("Connection lost. Trying to reach the AI server...");
        } else if (msg.includes("timeout") || msg.includes("408") || msg.includes("504")) {
          setError("Ollama is taking a bit longer to wake up. Please wait a moment and try again.");
        } else if (msg.includes("model not found") || msg.includes("404")) {
          setError("The selected model isn't ready or was removed. Check Settings.");
        } else {
          setError(msg || "Generation failed. Please try again.");
        }
      }
    } finally {
      clearTimeout(warmingTimer);
      setStreaming(false);
      setWarming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTool?.name || "content"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTools = activeCategory === "All" ? TOOLS : TOOLS.filter(t => t.category === activeCategory);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        onToggleSidebar={onToggleSidebar}
        title="Generator"
        subtitle={selectedTool ? selectedTool.name : "Choose a tool"}
        session={session}
        onOpenProfile={onOpenProfile}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Tool list ── */}
        <div className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col bg-ink-900 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Tools</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                    activeCategory === cat
                      ? "bg-ember-500/20 text-ember-400 font-medium"
                      : "bg-white/5 text-white/40 hover:text-white/70"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
            {filteredTools.map(tool => (
              <button key={tool.id}
                onClick={() => {
                  setSelectedTool(tool);
                  setFields({});
                  setOutput("");
                  setError("");
                  setRagUsed(false);
                  navigate(`/generate?tool=${tool.id}`);
                }}
                className={`card-hover flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all ${
                  selectedTool?.id === tool.id
                    ? "border-ember-500/40 bg-ember-500/8"
                    : "border-white/5 bg-ink-800 hover:border-white/10"
                }`}>
                <span className="text-lg flex-shrink-0">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedTool?.id === tool.id ? "text-ember-300" : "text-white/80"}`}>
                    {tool.name}
                  </p>
                  <p className="text-xs text-white/30 truncate">{tool.description.slice(0, 38)}...</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main panel ── */}
        <div className="flex flex-1 overflow-hidden">
          {!selectedTool ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)" }}>
                <Wand2 size={28} className="text-ember-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2">Pick a Tool</h3>
              <p className="text-white/40 text-sm max-w-xs">Select from 8 AI-powered content tools on the left to get started.</p>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">

              {/* ── Input panel ── */}
              <div className="lg:w-96 w-full flex-shrink-0 flex flex-col border-r border-white/5 overflow-y-auto max-h-[50vh] lg:max-h-none lg:h-full">
                <div className="p-5 flex-1">
                  {/* Tool header */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{selectedTool.icon}</span>
                    <div>
                      <h2 className="font-display font-bold text-white">{selectedTool.name}</h2>
                      <p className="text-xs text-white/40">{selectedTool.description}</p>
                    </div>
                  </div>

                  {/* Tool fields */}
                  <div className="flex flex-col gap-4 mb-5">
                    {selectedTool.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
                          {field.label}
                        </label>
                        <FieldInput
                          field={field}
                          value={fields[field.key] || ""}
                          onChange={val => { setFields(f => ({ ...f, [field.key]: val })); setHasGenerated(false); }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* RAG selector */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-2">Context</p>
                  <RagSelector
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    onChange={(val) => { setSelectedProjectId(val); setHasGenerated(false); }}
                  />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-300">{error}</p>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <div className="p-5 border-t border-white/5">
                  {selectedProjectId && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Database size={12} className="text-ember-400 flex-shrink-0" />
                      <p className="text-xs text-white/40">
                        Using <span className="text-ember-400 font-medium">
                          {projects.find(p => p.id === selectedProjectId)?.name}
                        </span> as context
                      </p>
                    </div>
                  )}
                  <button
                    onClick={streaming ? handleStop : handleGenerate}
                    disabled={hasGenerated && !streaming}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                      streaming
                        ? "text-red-400 border border-red-500/30 bg-red-500/10"
                        : hasGenerated
                        ? "text-white/30 cursor-not-allowed"
                        : "text-white shadow-lg shadow-ember-500/10"
                    }`}
                    style={!streaming && !hasGenerated ? { background: "linear-gradient(135deg, #ff6b35, #f54e1e)" } : !streaming && hasGenerated ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" } : {}}>
                    {streaming ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="opacity-50 mx-1">|</span>
                        <Square size={13} fill="currentColor" />
                        Stop Generation
                      </>
                    ) : (
                      <>{selectedProjectId ? "Generate with RAG" : "Generate Content"}</>
                    )}
                  </button>
                  {hasGenerated && !streaming && (
                    <p className="text-xs text-center text-white/25 mt-2">Modify a field to regenerate</p>
                  )}
                </div>
              </div>

              {/* ── Output panel ── */}
              <div className="flex-1 flex flex-col min-h-0 bg-ink-950">

                {/* Output toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-ink-900">
                  <div className="flex items-center gap-3">
                    {/* Status dot */}
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${streaming ? (warming ? "bg-ember-500 animate-bounce" : "bg-ember-400 animate-pulse") : output ? "bg-jade-400" : "bg-white/15"}`} />
                      <span className="text-xs font-medium text-white/40">
                        {streaming ? (warming ? "Warming up model…" : "Generating…") : output ? "Output" : "Output"}
                      </span>
                    </div>

                    {/* Meta info */}
                    {output && !streaming && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/10">|</span>
                        <span className="text-xs text-white/25">
                          {output.split(/\s+/).filter(Boolean).length} words
                        </span>
                        <span className="text-white/10">|</span>
                        <span className="text-xs text-white/25">
                          {output.length} chars
                        </span>
                      </div>
                    )}

                    {/* RAG badge */}
                    {ragUsed && !streaming && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                        style={{ background: "rgba(255,107,53,0.1)", color: "#ff6b35", border: "1px solid rgba(255,107,53,0.2)" }}>
                        <Database size={10} /> RAG
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {streaming ? (
                    <button onClick={handleStop}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-95">
                      <Square size={11} fill="currentColor" />
                      Stop Generation
                    </button>
                  ) : output && (
                    <div className="flex items-center gap-1">
                      <button onClick={handleDownload}
                        className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all font-medium">
                        <Download size={12} />
                        Export
                      </button>
                      <div className="w-px h-4 bg-white/10" />
                      <button onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                        style={copied
                          ? { background: "rgba(63,255,162,0.1)", color: "#3fffa2", border: "1px solid rgba(63,255,162,0.2)" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Output body */}
                <div ref={outputRef} className="flex-1 overflow-auto">

                  {/* Empty state */}
                  {!output && !streaming && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-8">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <RefreshCw size={18} className="text-white/20" />
                      </div>
                      <p className="text-sm font-medium text-white/30 mb-1">No output yet</p>
                      <p className="text-xs text-white/15 max-w-xs leading-relaxed">
                        {selectedProjectId
                          ? "Fill in the fields above and click Generate. Your knowledge base will be used as context."
                          : "Fill in the fields on the left and click Generate to see your content here."
                        }
                      </p>
                    </div>
                  )}

                  {/* Streaming skeleton */}
                  {streaming && !output && (
                    <div className="p-6 space-y-3">
                      {[100, 85, 92, 70].map((w, i) => (
                        <div key={i} className="h-3 rounded animate-pulse"
                          style={{ width: `${w}%`, background: "rgba(255,255,255,0.06)", animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}

                  {/* Actual output */}
                  {output && (
                    <div className="p-6">
                      {/* Tool label */}
                      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
                        <span className="text-sm">{selectedTool?.icon}</span>
                        <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                          {selectedTool?.name}
                        </span>
                        <span className="text-white/10 mx-1">·</span>
                        <span className="text-xs text-white/20">
                          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Content */}
                      <div className={streaming ? "output-streaming" : "animate-fade-in"}>
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
                          {output}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
