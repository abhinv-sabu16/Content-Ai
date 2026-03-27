import { useState, useEffect, useRef } from "react";
import { IoAddOutline, IoTrashOutline, IoDocumentTextOutline, IoGlobeOutline, IoCloudUploadOutline, IoCloseOutline, IoCheckmarkOutline, IoAlertCircleOutline, IoReloadOutline, IoBookOutline, IoChevronForwardOutline, IoStarOutline, IoSearchOutline, IoLinkOutline, IoDocumentOutline } from "react-icons/io5";;
import TopBar from "../components/TopBar";
import {
  getProjects, createProject, deleteProject,
  getSources, uploadFile, addUrlSource, deleteSource
} from "../lib/projects";

// ── Source type icon ──────────────────────────────────────────
function SourceIcon({ type, name }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (type === "url") return <IoGlobeOutline size={14} className="text-blue-400 flex-shrink-0" />;
  if (ext === "pdf") return <IoDocumentTextOutline size={14} className="text-red-400 flex-shrink-0" />;
  if (ext === "docx") return <IoDocumentOutline size={14} className="text-blue-400 flex-shrink-0" />;
  return <IoDocumentTextOutline size={14} className="text-white/40 flex-shrink-0" />;
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.15)" }}>
        <Icon size={24} className="text-ember-400/60" />
      </div>
      <p className="text-sm font-semibold text-white/50 mb-1">{title}</p>
      <p className="text-xs text-white/25 max-w-xs leading-relaxed mb-4">{subtitle}</p>
      {action}
    </div>
  );
}

// ── Create project modal ──────────────────────────────────────
function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    setLoading(true);
    try {
      const data = await createProject(name, description);
      onCreate(data.project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(5,5,8,0.8)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden animate-slide-up"
          style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, #ff6b35, #f54e1e, #a78bfa)" }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-white">New Knowledge Base</h3>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <IoCloseOutline size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Name</label>
                <input ref={inputRef} type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }}
                  placeholder="e.g. Brand Guidelines, Product Docs"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-700 border border-gray-300 bg-white focus:border-ember-500/50 transition-all"
                  style={{ outline: "none" }}
                  onKeyDown={e => e.key === "Enter" && handleCreate()} />
                {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">Description <span className="text-white/20 normal-case">(optional)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What's in this knowledge base?"
                  rows={2} className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-700 border border-gray-300 bg-white focus:border-ember-500/50 transition-all resize-none"
                  style={{ outline: "none" }} />
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button onClick={handleCreate} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                {loading ? <IoReloadOutline size={14} className="animate-spin" /> : <IoAddOutline size={14} />}
                {loading ? "Creating…" : "Create Project"}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── IoCloudUploadOutline zone ───────────────────────────────────────────────
function UploadZone({ projectId, onAdded }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef();

  const processFile = async (file) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.type)) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const data = await uploadFile(projectId, file, setProgress);
      setSuccess(data.message);
      onAdded();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const data = await addUrlSource(projectId, url.trim());
      setSuccess(data.message);
      setUrl("");
      onAdded();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: false, icon: IoCloudUploadOutline, label: "IoCloudUploadOutline IoDocumentOutline" },
          { id: true, icon: IoLinkOutline, label: "Add URL" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={String(id)} onClick={() => { setUrlMode(id); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${urlMode === id ? "text-white" : "text-white/35 hover:text-white/60"}`}
            style={urlMode === id ? { background: "linear-gradient(135deg, #ff6b35, #f54e1e)" } : {}}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {!urlMode ? (
        // IoDocumentOutline drop zone
        <div
          onClick={() => !uploading && fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? "rgba(255,107,53,0.6)" : "rgba(255,255,255,0.1)",
            background: dragOver ? "rgba(255,107,53,0.05)" : "rgba(255,255,255,0.02)",
          }}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
            onChange={e => e.target.files[0] && processFile(e.target.files[0])} />

          {uploading ? (
            <>
              <IoReloadOutline size={24} className="text-ember-400 animate-spin" />
              <div className="w-full max-w-xs">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all"
                    style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-white/40 text-center mt-1.5">Processing {progress}%</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)" }}>
                <IoCloudUploadOutline size={18} className="text-ember-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/60">Drop file here or <span className="text-ember-400">browse</span></p>
                <p className="text-xs text-white/25 mt-1">PDF, DOCX, TXT · Max 10MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        // URL input
        <div className="flex gap-2">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-white/85 placeholder-white/20 border border-white/8 bg-white/4 focus:border-ember-500/50 transition-all"
            style={{ outline: "none" }}
            onKeyDown={e => e.key === "Enter" && handleUrl()} />
          <button onClick={handleUrl} disabled={!url.trim() || uploading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
            {uploading ? <IoReloadOutline size={13} className="animate-spin" /> : <IoAddOutline size={13} />}
            {uploading ? "Scraping…" : "Add"}
          </button>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl animate-fade-in"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <IoAlertCircleOutline size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl animate-fade-in"
          style={{ background: "rgba(63,255,162,0.08)", border: "1px solid rgba(63,255,162,0.2)" }}>
          <IoCheckmarkOutline size={13} className="text-jade-400 flex-shrink-0" />
          <p className="text-xs text-jade-400">{success}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function KnowledgeBase({ onToggleSidebar, session, onOpenProfile }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showProjectList, setShowProjectList] = useState(false);

  // Load projects
  useEffect(() => {
    getProjects()
      .then(data => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load sources when project selected
  useEffect(() => {
    if (!selectedProject) { setSources([]); return; }
    setSourcesLoading(true);
    getSources(selectedProject.id)
      .then(data => setSources(data.sources || []))
      .catch(() => setSources([]))
      .finally(() => setSourcesLoading(false));
  }, [selectedProject]);

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this project and all its documents?")) return;
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects(p => p.filter(x => x.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    if (!confirm("Remove this source?")) return;
    try {
      await deleteSource(selectedProject.id, sourceId);
      setSources(s => s.filter(x => x.id !== sourceId));
      setProjects(p => p.map(x => x.id === selectedProject.id
        ? { ...x, sourceCount: Math.max(0, x.sourceCount - 1) }
        : x
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const refreshSources = () => {
    if (!selectedProject) return;
    getSources(selectedProject.id).then(data => {
      setSources(data.sources || []);
      setProjects(p => p.map(x => x.id === selectedProject.id
        ? { ...x, sourceCount: data.sources?.length || 0 }
        : x
      ));
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar onToggleSidebar={onToggleSidebar} title="Knowledge Base"
        subtitle={selectedProject ? selectedProject.name : "Select a project"}
        session={session} onOpenProfile={onOpenProfile} />

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left: Project list — Drawer on mobile ── */}
        <div className={`
          absolute inset-y-0 left-0 z-20 w-72 border-r border-white/5 bg-ink-900 flex flex-col transition-all duration-300 lg:relative lg:translate-x-0
          ${showProjectList ? "translate-x-0" : "-translate-x-full"}
          lg:flex flex-shrink-0
        `}>
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Knowledge Bases</span>
            <button onClick={() => setShowProjectList(false)} className="text-white/30 hover:text-white/60">
              <IoCloseOutline size={16} />
            </button>
          </div>

          <div className="p-4 border-b border-white/5">
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
              <IoAddOutline size={15} /> New Project
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <IoReloadOutline size={20} className="text-white/20 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <EmptyState icon={IoStarOutline} title="No projects yet"
                subtitle="Create a project to start uploading documents for AI-powered generation." />
            ) : (
              projects.map(project => (
                <button key={project.id}
                  onClick={() => { setSelectedProject(project); setShowProjectList(false); }}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border mb-1.5 transition-all group ${
                    selectedProject?.id === project.id
                      ? "border-ember-500/40 bg-ember-500/8"
                      : "border-white/5 bg-ink-800 hover:border-white/10"
                  }`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(255,107,53,0.12)" }}>
                    <IoBookOutline size={14} className="text-ember-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedProject?.id === project.id ? "text-ember-300" : "text-white/80"}`}>
                      {project.name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {project.sourceCount || 0} source{project.sourceCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={e => handleDeleteProject(project.id, e)}
                    disabled={deletingId === project.id}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0 mt-0.5">
                    {deletingId === project.id
                      ? <IoReloadOutline size={12} className="animate-spin" />
                      : <IoTrashOutline size={12} />
                    }
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Mobile Backdrop */}
        {showProjectList && (
          <div className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowProjectList(false)} />
        )}

        {/* ── Right: Project detail ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!selectedProject ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)" }}>
                <IoBookOutline size={28} className="text-ember-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2">Select a Project</h3>
              <p className="text-white/40 text-sm max-w-xs mb-6">Choose a knowledge base to manage documents, or create a new one.</p>
              <button 
                onClick={() => setShowProjectList(true)}
                className="lg:hidden flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ember-500/10 text-ember-400 border border-ember-500/20 font-semibold text-sm transition-all active:scale-95"
              >
                View Projects
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <h2 className="font-display font-bold text-white leading-none">{selectedProject.name}</h2>
                    {selectedProject.description && (
                      <p className="text-xs text-white/35 mt-1 hidden sm:block">{selectedProject.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => setShowProjectList(true)} className="lg:hidden px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/40">
                    KBs
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">

                {/* IoCloudUploadOutline zone */}
                <div className="w-80 flex-shrink-0">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Add Sources</p>
                  <UploadZone projectId={selectedProject.id} onAdded={refreshSources} />

                  {/* How to use in Generator */}
                  <div className="mt-4 p-4 rounded-xl"
                    style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.12)" }}>
                    <p className="text-xs font-semibold text-ember-400 mb-2">💡 How to use in Generator</p>
                    <ol className="text-xs text-white/40 leading-relaxed space-y-1 list-decimal list-inside">
                      <li>IoCloudUploadOutline your documents here</li>
                      <li>Go to the Generator page</li>
                      <li>Select this project in the RAG panel</li>
                      <li>AI will use your docs as context</li>
                    </ol>
                    <p className="text-xs text-white/25 mt-2 font-mono">
                      Project ID: {selectedProject.id.slice(0, 12)}…
                    </p>
                  </div>
                </div>

                {/* Sources list */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                    Sources ({sources.length})
                  </p>

                  {sourcesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <IoReloadOutline size={20} className="text-white/20 animate-spin" />
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <IoCloudUploadOutline size={28} className="text-white/10 mb-3" />
                      <p className="text-sm text-white/25">No sources yet</p>
                      <p className="text-xs text-white/15 mt-1">IoCloudUploadOutline files or add a URL to get started</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sources.map(source => (
                        <div key={source.id}
                          className="flex items-start gap-3 p-3.5 rounded-xl group transition-all"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.05)" }}>
                            <SourceIcon type={source.type} name={source.name} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/75 truncate font-medium">{source.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-white/25">
                                {source.chunkCount} chunk{source.chunkCount !== 1 ? "s" : ""}
                              </span>
                              <span className="text-white/10">·</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                source.type === "url"
                                  ? "text-blue-400 bg-blue-400/10"
                                  : "text-white/30 bg-white/5"
                              }`}>
                                {source.type === "url" ? "URL" : source.name?.split(".").pop()?.toUpperCase()}
                              </span>
                              <span className="text-white/10">·</span>
                              <span className="text-xs text-white/20">
                                {new Date(source.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteSource(source.id)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                            <IoTrashOutline size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={(p) => {
            setProjects(prev => [p, ...prev]);
            setSelectedProject(p);
          }}
        />
      )}
    </div>
  );
}
