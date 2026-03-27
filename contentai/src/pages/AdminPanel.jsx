import { useState, useEffect, useCallback } from "react";
import { IoPeopleOutline, IoStarOutline, IoSyncOutline, IoTrashOutline, IoCheckmarkOutline, IoCloseOutline, IoSearchOutline, IoChevronDownOutline, IoShieldOutline, IoFlashOutline, IoPulseOutline, IoTimeOutline, IoGlobeOutline, IoCheckmarkCircleOutline, IoReloadOutline, IoEyeOutline, IoTrendingUpOutline, IoServerOutline, IoHardwareChipOutline } from "react-icons/io5";;
import TopBar from "../components/TopBar";
import {
  getAdminStats, getAdminSystem, getAdminUsers,
  updateAdminUser, deleteAdminUser, resetUserUsage,
  getAdminErrors, resolveError, clearResolved,
} from "../lib/admin";

// ── Shared components ─────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "#ff6b35" }) {
  return (
    <div className="flex flex-col p-4 rounded-xl border border-white/5 bg-ink-800">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="font-display font-bold text-xl text-white">{value ?? "—"}</p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1 font-medium" style={{ color }}>{sub}</p>}
    </div>
  );
}

function Badge({ label, color }) {
  const colors = {
    green: { bg: "rgba(63,255,162,0.12)", text: "#3fffa2" },
    red: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
    orange: { bg: "rgba(255,107,53,0.12)", text: "#ff6b35" },
    blue: { bg: "rgba(56,189,248,0.12)", text: "#38bdf8" },
    purple: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
    gray: { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display font-bold text-white text-sm">{title}</h3>
      {action}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────
function OverviewTab({ stats, system, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <IoReloadOutline size={24} className="text-white/20 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* User stats */}
      <div>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">IoPeopleOutline</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={IoPeopleOutline} label="Total IoPeopleOutline" value={stats?.users?.total} color="#38bdf8" />
          <StatCard icon={IoTrendingUpOutline} label="New Today" value={stats?.users?.newToday} sub={`+${stats?.users?.newThisWeek || 0} this week`} color="#3fffa2" />
          <StatCard icon={IoPulseOutline} label="Active Today" value={stats?.users?.activeToday} color="#ff6b35" />
          <StatCard icon={IoStarOutline} label="Suspended" value={stats?.users?.suspended} color="#f87171" />
        </div>
      </div>

      {/* Generation stats */}
      <div>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Generations</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={IoFlashOutline} label="Total Generated" value={stats?.generations?.total} color="#ff6b35" />
          <StatCard icon={IoStarOutline} label="Avg per User" value={stats?.generations?.avgPerUser} color="#a78bfa" />
          <StatCard icon={IoStarOutline} label="Admin IoPeopleOutline" value={stats?.users?.admins} color="#eab308" />
        </div>
      </div>

      {/* Plan breakdown */}
      <div>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Plans</p>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(stats?.users?.plans || {}).map(([plan, count]) => (
            <div key={plan} className="p-4 rounded-xl border border-white/5 bg-ink-800">
              <p className="font-bold text-xl text-white">{count}</p>
              <p className="text-xs text-white/40 capitalize mt-0.5">{plan} plan</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error stats */}
      <div>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Errors</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={IoStarOutline} label="Total Logged" value={stats?.errors?.total} color="#f97316" />
          <StatCard icon={IoStarOutline} label="Unresolved" value={stats?.errors?.unresolved} color="#f87171" />
          <StatCard icon={IoTimeOutline} label="Last 24h" value={stats?.errors?.last24h} color="#eab308" />
          <StatCard icon={IoStarOutline} label="Last 7 Days" value={stats?.errors?.last7d} color="#a78bfa" />
        </div>
      </div>

      {/* Top error routes */}
      {stats?.errors?.topRoutes?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Top Error Routes</p>
          <div className="flex flex-col gap-2">
            {stats.errors.topRoutes.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/5 bg-ink-800">
                <span className="text-sm font-mono text-white/60">{r.route}</span>
                <Badge label={`${r.count} errors`} color="red" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System info */}
      {system && (
        <div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">System</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={IoHardwareChipOutline} label="Node.js" value={system.server?.nodeVersion} color="#38bdf8" />
            <StatCard icon={IoStarOutline} label="Memory" value={`${system.server?.memoryMB}MB`} color="#a78bfa" />
            <StatCard icon={IoTimeOutline} label="Uptime" value={`${Math.floor((system.server?.uptime || 0) / 60)}m`} color="#3fffa2" />
            <StatCard icon={IoFlashOutline} label="Groq" value="Online"
              color="#818cf8"
              sub={JSON.parse(localStorage.getItem("contentai_settings") || "{}").activeModel || "Llama 3.1 (8B)"} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── IoPeopleOutline tab ─────────────────────────────────────────────────
function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (planFilter) params.plan = planFilter;
      const data = await getAdminUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (_) {}
    finally { setLoading(false); }
  }, [search, planFilter]);

  useEffect(() => { load(); }, [load]);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(""), 3000); };

  const handleUpdate = async (id, updates) => {
    setSaving(true);
    try {
      const data = await updateAdminUser(id, updates);
      setUsers(u => u.map(x => x.id === id ? data.user : x));
      if (selectedUser?.id === id) setSelectedUser(data.user);
      showMsg("User updated successfully.");
    } catch (err) { showMsg(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleResetUsage = async (id) => {
    try {
      await resetUserUsage(id);
      setUsers(u => u.map(x => x.id === id ? { ...x, generationsUsed: 0 } : x));
      if (selectedUser?.id === id) setSelectedUser(s => ({ ...s, generationsUsed: 0 }));
      showMsg("Usage reset to 0.");
    } catch (err) { showMsg(`Error: ${err.message}`); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminUser(id);
      setUsers(u => u.filter(x => x.id !== id));
      setDeleteConfirm(null);
      setSelectedUser(null);
      showMsg("User deleted.");
    } catch (err) { showMsg(`Error: ${err.message}`); }
  };

  return (
    <div className="flex gap-5 h-full">
      {/* User list */}
      <div className="flex-1 flex flex-col min-w-0">
        <SectionHeader title={`IoPeopleOutline (${total})`} action={
          <button onClick={load} className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
            <IoSyncOutline size={11} /> Refresh
          </button>
        } />

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <IoSearchOutline size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input type="text" placeholder="IoSearchOutline name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-ink-700 border border-white/5 text-sm text-white/80 placeholder-white/20 focus:border-ember-500/30 transition-colors"
              style={{ outline: "none" }} />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            className="text-xs bg-ink-700 border border-white/5 rounded-lg px-3 py-2 text-white/50 focus:border-ember-500/30 transition-colors"
            style={{ outline: "none" }}>
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {actionMsg && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium animate-fade-in"
            style={{ background: actionMsg.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(63,255,162,0.1)", color: actionMsg.startsWith("Error") ? "#f87171" : "#3fffa2" }}>
            {actionMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12"><IoReloadOutline size={20} className="text-white/20 animate-spin" /></div>
        ) : (
          <div className="flex flex-col gap-1.5 overflow-auto">
            {users.map(user => (
              <button key={user.id}
                onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all group ${
                  selectedUser?.id === user.id
                    ? "border-ember-500/40 bg-ember-500/8"
                    : "border-white/5 bg-ink-800 hover:border-white/10"
                }`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: user.suspended ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                  {user.avatar
                    ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    : user.name?.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white/80 truncate">{user.name}</p>
                    {user.isAdmin && <IoStarOutline size={11} className="text-yellow-400 flex-shrink-0" />}
                    {user.suspended && <IoStarOutline size={11} className="text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-white/30 truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge label={user.plan} color={user.plan === "pro" ? "purple" : user.plan === "enterprise" ? "blue" : "gray"} />
                  <span className="text-xs text-white/20">{user.generationsUsed}/{user.generationsLimit}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User detail panel */}
      {selectedUser && (
        <div className="w-72 flex-shrink-0 flex flex-col">
          <SectionHeader title="User Details" action={
            <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white/60 transition-colors">
              <IoCloseOutline size={14} />
            </button>
          } />

          <div className="flex flex-col gap-4 overflow-auto">
            {/* Profile */}
            <div className="p-4 rounded-xl border border-white/5 bg-ink-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                  {selectedUser.avatar
                    ? <img src={selectedUser.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    : selectedUser.name?.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedUser.name}</p>
                  <p className="text-xs text-white/40">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-white/40">
                <div className="flex justify-between">
                  <span>Joined</span>
                  <span className="text-white/60">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last login</span>
                  <span className="text-white/60">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : "Never"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auth</span>
                  <span className="text-white/60">{selectedUser.googleId ? "Google" : "Email"}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID</span>
                  <span className="text-white/40 font-mono">{selectedUser.id.slice(0, 8)}…</span>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="p-4 rounded-xl border border-white/5 bg-ink-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white/50">Generations</p>
                <button onClick={() => handleResetUsage(selectedUser.id)}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-ember-400 transition-colors">
                  <IoStarOutline size={11} /> Reset
                </button>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden mb-1.5">
                <div className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400"
                  style={{ width: `${Math.min((selectedUser.generationsUsed / selectedUser.generationsLimit) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-white/30">{selectedUser.generationsUsed} / {selectedUser.generationsLimit}</p>
            </div>

            {/* Actions */}
            <div className="p-4 rounded-xl border border-white/5 bg-ink-800 space-y-3">
              <p className="text-xs font-semibold text-white/50">Actions</p>

              {/* Plan */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">Plan</label>
                <select value={selectedUser.plan}
                  onChange={e => handleUpdate(selectedUser.id, { plan: e.target.value })}
                  disabled={saving}
                  className="w-full text-xs bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-white/70"
                  style={{ outline: "none" }}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Generation limit */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">Generation Limit</label>
                <input type="number" value={selectedUser.generationsLimit}
                  onChange={e => handleUpdate(selectedUser.id, { generationsLimit: parseInt(e.target.value) })}
                  disabled={saving}
                  className="w-full text-xs bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-white/70"
                  style={{ outline: "none" }} />
              </div>

              {/* Toggle buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleUpdate(selectedUser.id, { suspended: !selectedUser.suspended })}
                  disabled={saving || selectedUser.id === currentUserId}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={selectedUser.suspended
                    ? { background: "rgba(63,255,162,0.12)", color: "#3fffa2" }
                    : { background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                  {selectedUser.suspended ? <><IoCheckmarkCircleOutline size={13} /> Unsuspend</> : <><IoStarOutline size={13} /> Suspend</>}
                </button>

                <button
                  onClick={() => handleUpdate(selectedUser.id, { isAdmin: !selectedUser.isAdmin })}
                  disabled={saving || selectedUser.id === currentUserId}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={selectedUser.isAdmin
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
                    : { background: "rgba(234,179,8,0.12)", color: "#eab308" }}>
                  <IoStarOutline size={13} /> {selectedUser.isAdmin ? "Remove Admin" : "Make Admin"}
                </button>
              </div>
            </div>

            {/* Delete */}
            {selectedUser.id !== currentUserId && (
              <div>
                {deleteConfirm === selectedUser.id ? (
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                    <p className="text-xs text-red-300 mb-2">Delete this account permanently?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(selectedUser.id)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="flex-1 py-1.5 rounded-lg text-xs text-white/40 hover:bg-white/5 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(selectedUser.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/8 transition-all">
                    <IoTrashOutline size={13} /> Delete Account
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Errors tab ────────────────────────────────────────────────
function ErrorsTab() {
  const [errors, setErrors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (!showResolved) params.resolved = false;
      const data = await getAdminErrors(params);
      setErrors(data.logs || []);
      setTotal(data.total || 0);
    } catch (_) {}
    finally { setLoading(false); }
  }, [showResolved]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id) => {
    try {
      await resolveError(id);
      setErrors(e => e.map(x => x.id === id ? { ...x, resolved: true } : x));
      if (selected?.id === id) setSelected(s => ({ ...s, resolved: true }));
    } catch (_) {}
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearResolved();
      await load();
    } catch (_) {}
    finally { setClearing(false); }
  };

  const statusColor = (status) => {
    if (status >= 500) return "red";
    if (status >= 400) return "orange";
    return "gray";
  };

  return (
    <div className="flex gap-5">
      <div className="flex-1 flex flex-col min-w-0">
        <SectionHeader title={`Error Logs (${total})`} action={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowResolved(s => !s)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors">
              {showResolved ? "Hide resolved" : "Show resolved"}
            </button>
            <button onClick={handleClear} disabled={clearing}
              className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors">
              {clearing ? <IoReloadOutline size={11} className="animate-spin" /> : <IoTrashOutline size={11} />}
              Clear resolved
            </button>
            <button onClick={load} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              <IoSyncOutline size={11} />
            </button>
          </div>
        } />

        {loading ? (
          <div className="flex items-center justify-center py-12"><IoReloadOutline size={20} className="text-white/20 animate-spin" /></div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IoCheckmarkCircleOutline size={28} className="text-jade-400/40 mb-3" />
            <p className="text-sm text-white/30">No errors logged</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 overflow-auto">
            {errors.map(err => (
              <button key={err.id}
                onClick={() => setSelected(selected?.id === err.id ? null : err)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  selected?.id === err.id ? "border-ember-500/40 bg-ember-500/8" : "border-white/5 bg-ink-800 hover:border-white/10"
                } ${err.resolved ? "opacity-40" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge label={err.status} color={statusColor(err.status)} />
                    <span className="text-xs font-mono text-white/50 truncate">{err.method} {err.route}</span>
                    {err.resolved && <Badge label="resolved" color="green" />}
                  </div>
                  <p className="text-xs text-white/60 truncate">{err.message}</p>
                  <p className="text-xs text-white/20 mt-0.5">{new Date(err.timestamp).toLocaleString()}</p>
                </div>
                {!err.resolved && (
                  <button onClick={e => { e.stopPropagation(); handleResolve(err.id); }}
                    className="text-white/20 hover:text-jade-400 transition-colors flex-shrink-0 mt-0.5">
                    <IoCheckmarkOutline size={14} />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error detail */}
      {selected && (
        <div className="w-80 flex-shrink-0">
          <SectionHeader title="Error Detail" action={
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 transition-colors">
              <IoCloseOutline size={14} />
            </button>
          } />
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-white/5 bg-ink-800 space-y-2.5 text-xs">
              {[
                ["Status", <Badge label={selected.status} color={statusColor(selected.status)} />],
                ["Method", selected.method],
                ["Route", selected.route],
                ["Time", new Date(selected.timestamp).toLocaleString()],
                ["User ID", selected.userId || "Guest"],
                ["IP", selected.ip || "Unknown"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2">
                  <span className="text-white/30 flex-shrink-0">{k}</span>
                  <span className="text-white/70 text-right font-mono break-all">{v}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-red-500/15 bg-red-500/5">
              <p className="text-xs font-semibold text-red-400 mb-1.5">Message</p>
              <p className="text-xs text-red-300/80 leading-relaxed">{selected.message}</p>
            </div>

            {selected.stack && (
              <div className="p-4 rounded-xl border border-white/5 bg-ink-800">
                <p className="text-xs font-semibold text-white/40 mb-1.5">Stack Trace</p>
                <pre className="text-xs text-white/30 font-mono leading-relaxed overflow-auto max-h-48 whitespace-pre-wrap">
                  {selected.stack}
                </pre>
              </div>
            )}

            {!selected.resolved && (
              <button onClick={() => handleResolve(selected.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "rgba(63,255,162,0.12)", color: "#3fffa2" }}>
                <IoCheckmarkOutline size={13} /> Mark as Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin page ───────────────────────────────────────────
const TABS = [
  { id: "overview", icon: IoStarOutline, label: "Overview" },
  { id: "users", icon: IoPeopleOutline, label: "IoPeopleOutline" },
  { id: "errors", icon: IoStarOutline, label: "Error Logs" },
];

export default function AdminPanel({ onToggleSidebar, session, onOpenProfile }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [system, setSystem] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [s, sys] = await Promise.all([getAdminStats(), getAdminSystem()]);
      setStats(s);
      setSystem(sys);
      setLastRefresh(new Date());
    } catch (_) {}
    finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const unresolvedErrors = stats?.errors?.unresolved || 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        onToggleSidebar={onToggleSidebar}
        title="Admin Panel"
        subtitle="System management & monitoring"
        session={session}
        onOpenProfile={onOpenProfile}
      />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Admin header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5"
          style={{ background: "rgba(255,107,53,0.04)" }}>
          <div className="flex items-center gap-2">
            <IoShieldOutline size={14} className="text-ember-400" />
            <span className="text-xs font-bold text-ember-400 uppercase tracking-widest">Admin Access</span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-white/20">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button onClick={loadStats} disabled={statsLoading}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
              <IoSyncOutline size={11} className={statsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all relative ${
                tab === id ? "border-ember-400 text-ember-400" : "border-transparent text-white/35 hover:text-white/60"
              }`}>
              <Icon size={13} />
              {label}
              {id === "errors" && unresolvedErrors > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "#ef4444", fontSize: "9px" }}>
                  {unresolvedErrors > 9 ? "9+" : unresolvedErrors}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === "overview" && <OverviewTab stats={stats} system={system} loading={statsLoading} />}
          {tab === "users" && <UsersTab currentUserId={session?.id} />}
          {tab === "errors" && <ErrorsTab />}
        </div>
      </div>
    </div>
  );
}
