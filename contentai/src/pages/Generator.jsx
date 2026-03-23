import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Wand2, Copy, Check, Download, RefreshCw, ChevronDown,
  Sparkles, AlertCircle, BookOpen, X, ChevronUp, Database
} from "lucide-react";
import TopBar from "../components/TopBar";
import { TOOLS, CATEGORIES } from "../lib/tools";
import { generateContent } from "../lib/api";
import { saveToHistory, incrementUsage } from "../lib/history";
import { getProjects } from "../lib/projects";

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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [ragUsed, setRagUsed] = useState(false);
  const [showToolList, setShowToolList] = useState(false);
  const outputRef = useRef(null);

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
      if (tool) { setSelectedTool(tool); setFields({}); setOutput(""); setRagUsed(false); setShowToolList(false); }
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

    try {
      const systemPrompt = selectedTool.systemPrompt(fields);
      const userMessage = "Generate the content now based on the provided details. Be thorough, creative, and professional.";

      const result = await generateContent(
        systemPrompt,
        userMessage,
        (text) => setOutput(text),
        selectedProjectId || null,
        (used) => setRagUsed(used),
      );

      incrementUsage();
      saveToHistory({ toolId: selectedTool.id, toolName: selectedTool.name, fields, output: result });
    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
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

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left: Tool list — Drawer on mobile, sidebar on desktop ── */}
        <div className={`
          absolute inset-y-0 left-0 z-20 w-72 border-r border-white/5 flex flex-col bg-ink-900 transition-all duration-300 lg:relative lg:translate-x-0
          ${showToolList ? "translate-x-0" : "-translate-x-full"}
          lg:flex flex-shrink-0
        `}>
          {/* Mobile Tool List Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Select Tool</span>
            <button onClick={() => setShowToolList(false)} className="text-white/30 hover:text-white/60">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 border-b border-white/5">
            <p className="hidden lg:block text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Tools</p>
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

        {/* Mobile Tool Drawer Backdrop */}
        {showToolList && (
          <div className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowToolList(false)} />
        )}

        {/* ── Main panel ── */}
        <div className="flex flex-1 overflow-hidden">
          {!selectedTool ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)" }}>
                <Wand2 size={28} className="text-ember-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2">Pick a Tool</h3>
              <p className="text-white/40 text-sm max-w-xs mb-6">Select from 8 AI-powered content tools to get started.</p>
              <button 
                onClick={() => setShowToolList(true)}
                className="lg:hidden flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ember-500/10 text-ember-400 border border-ember-500/20 font-semibold text-sm transition-all active:scale-95"
              >
                Browse Tools
              </button>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

              {/* ── Input panel ── */}
              <div className="lg:w-96 flex-shrink-0 flex flex-col border-r border-white/5 overflow-auto">
                <div className="p-5 flex-1">
                  {/* Tool header */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedTool.icon}</span>
                      <div>
                        <h2 className="font-display font-bold text-white leading-tight">{selectedTool.name}</h2>
                        <p className="text-xs text-white/40">{selectedTool.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowToolList(true)}
                      className="lg:hidden p-2 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/70"
                    >
                      Change
                    </button>
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
                          onChange={val => setFields(f => ({ ...f, [field.key]: val }))}
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
                      onChange={setSelectedProjectId}
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
                    onClick={handleGenerate}
                    disabled={streaming}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: streaming ? "#2d1008" : "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                    {streaming ? (
                      <><RefreshCw size={15} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles size={15} /> {selectedProjectId ? "Generate with RAG" : "Generate Content"}</>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Output panel ── */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-jade-400 animate-pulse-slow" />
                    <span className="text-xs text-white/40 font-medium">
                      {streaming ? "Generating..." : output ? "Output Ready" : "Output"}
                    </span>
                    {output && !streaming && (
                      <span className="text-xs text-white/20">{output.length} chars</span>
                    )}
                    {ragUsed && !streaming && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,107,53,0.12)", color: "#ff6b35" }}>
                        <Database size={10} /> RAG
                      </span>
                    )}
                  </div>
                  {output && !streaming && (
                    <div className="flex items-center gap-2">
                      <button onClick={handleDownload}
                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                        <Download size={13} /> Save
                      </button>
                      <button onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                        style={copied
                          ? { background: "rgba(63,255,162,0.12)", color: "#3fffa2" }
                          : { background: "rgba(255,107,53,0.12)", color: "#ff6b35" }}>
                        {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  )}
                </div>
                <div ref={outputRef} className="flex-1 overflow-auto p-5">
                  {!output && !streaming && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/20 gap-3">
                      <Sparkles size={32} className="opacity-30" />
                      <p className="text-sm">Fill in the fields and click Generate</p>
                      {selectedProjectId && (
                        <p className="text-xs text-ember-400/50">
                          Knowledge base context will be used automatically
                        </p>
                      )}
                    </div>
                  )}
                  {output && (
                    <div className={`font-mono text-sm text-white/80 leading-relaxed whitespace-pre-wrap ${streaming ? "output-streaming" : "animate-fade-in"}`}>
                      {output}
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
