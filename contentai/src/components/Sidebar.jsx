import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wand2, History, Settings, Zap, LogOut, BookOpen, Shield } from "lucide-react";

export default function Sidebar({ collapsed, session, onLogout, onOpenProfile }) {
  const initials = session?.name
    ? session.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/generate", icon: Wand2, label: "Generate" },
    { to: "/knowledge", icon: BookOpen, label: "Knowledge" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
    // Admin link only visible to admins
    ...(session?.isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin", admin: true }] : []),
  ];

  return (
    <aside
      className="flex flex-col border-r border-white/5 bg-ink-900 transition-all duration-300 flex-shrink-0"
      style={{ width: collapsed ? "72px" : "220px", minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
          <Zap size={16} fill="white" color="white" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-white tracking-tight text-lg leading-none">
            ContentAI
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ to, icon: Icon, label, admin }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 relative
               ${isActive
                ? admin ? "bg-yellow-500/15 text-yellow-400 font-medium" : "bg-ember-500/15 text-ember-400 font-medium"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"}`
            }>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${admin ? "bg-yellow-400" : "bg-ember-400"}`} />
                )}
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        {!collapsed ? (
          <>
            <div className="rounded-xl p-3 mb-3"
              style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.12)" }}>
              <p className="text-xs text-ember-400 font-semibold mb-1">Free Plan</p>
              <div className="w-full h-1 rounded-full bg-white/10 mb-1.5">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-ember-500 to-ember-400" />
              </div>
              <p className="text-xs text-white/30">33/100 generations</p>
            </div>
            <div className="flex items-center gap-2.5 px-1">
              <button onClick={onOpenProfile} className="flex-shrink-0 group" title="View profile">
                {session?.avatar ? (
                  <img src={session.avatar} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-ember-400/50 transition-all" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all group-hover:opacity-80"
                    style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                    {initials}
                  </div>
                )}
              </button>
              <button onClick={onOpenProfile} className="flex-1 min-w-0 text-left group">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white/80 truncate group-hover:text-white/100 transition-colors">
                    {session?.name || "User"}
                  </p>
                  {session?.isAdmin && <Shield size={10} className="text-yellow-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-white/30 truncate">{session?.email || ""}</p>
              </button>
              <button onClick={onLogout} title="Sign out"
                className="w-6 h-6 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                <LogOut size={13} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button onClick={onOpenProfile} title="View profile" className="group">
              {session?.avatar ? (
                <img src={session.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-ember-400/50 transition-all" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all group-hover:opacity-80"
                  style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                  {initials}
                </div>
              )}
            </button>
            <button onClick={onLogout} title="Sign out"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
