import { Analytics } from "@vercel/analytics/react";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Generator from "./pages/Generator";
import History from "./pages/History";
import Settings from "./pages/Settings";
import KnowledgeBase from "./pages/KnowledgeBase";
import AdminPanel from "./pages/AdminPanel";
import Auth from "./pages/Auth";
import { LogoutPopup, WelcomePopup } from "./components/Popups";
import ProfileModal from "./components/ProfileModal";
import { getMe, logout, setCachedUser, clearCachedUser, refreshSession } from "./lib/auth";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-ember-400 rounded-full animate-spin" />
        <p className="text-sm text-white/30">Loading ContentAI...</p>
      </div>
    </div>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => { setCachedUser(user); setSession(user); })
      .catch(async () => {
        try {
          const user = await refreshSession();
          setCachedUser(user); setSession(user);
        } catch {
          clearCachedUser(); setSession(null);
        }
      })
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") window.history.replaceState({}, "", "/");
  }, []);

  const handleAuth = (user, isNew = false) => {
    setCachedUser(user);
    setSession(user);
    if (isNew) setTimeout(() => setShowWelcome(true), 400);
  };

  const handleLogoutConfirm = async () => {
    await logout();
    clearCachedUser();
    setSession(null);
    setShowLogoutPopup(false);
    setShowProfile(false);
  };

  // Used after account deletion — skip confirmation popup
  const handleForceLogout = () => {
    clearCachedUser();
    setSession(null);
    setShowProfile(false);
    setShowLogoutPopup(false);
  };

  const handleProfileUpdate = (updatedUser) => {
    setCachedUser(updatedUser);
    setSession(updatedUser);
  };

  const openProfile = () => setShowProfile(true);
  const toggle = () => setCollapsed(c => !c);

  if (loading) return <Spinner />;
  if (!session) return <Auth onAuth={handleAuth} />;

  // Shared props passed to every page
  const pageProps = {
    session,
    onToggleSidebar: toggle,
    onOpenProfile: openProfile,
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-ink-950">
        <Sidebar
          collapsed={collapsed}
          session={session}
          onLogout={() => setShowLogoutPopup(true)}
          onOpenProfile={openProfile}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/"          element={<Dashboard     {...pageProps} />} />
            <Route path="/generate"  element={<Generator     {...pageProps} />} />
            <Route path="/knowledge" element={<KnowledgeBase {...pageProps} />} />
            <Route path="/history"   element={<History       {...pageProps} />} />
            <Route path="/settings"  element={<Settings      {...pageProps} onLogout={() => setShowLogoutPopup(true)} />} />
            <Route path="/admin"     element={<AdminPanel    {...pageProps} />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {showLogoutPopup && (
        <LogoutPopup
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutPopup(false)}
        />
      )}

      {showWelcome && (
        <WelcomePopup
          userName={session?.name}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          session={session}
          onClose={() => setShowProfile(false)}
          onUpdate={handleProfileUpdate}
          onLogout={handleForceLogout}
        />
      )}

      <Analytics />
    </BrowserRouter>
  );
}
