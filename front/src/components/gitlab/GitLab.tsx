import React, { useEffect, useState } from "react";
import GitLabPopup from "./GitLabPopup";
import { getAuthStatus, listRepos, logout } from "../../services/gitlabService";
import "./gitlab.css";
import "./gitlabPopup.css";

type Status = {
  connected: boolean;
  host?: string | null;
  login?: string | null;
  avatarUrl?: string | null;
  error?: string | null;
};

export default function GitLab() {
  const [status, setStatus] = useState<Status>({
    connected: false,
    host: null,
    login: null,
  });
  const [repos, setRepos] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getAuthStatus();
        if (s)
          setStatus({
            connected: !!s.connected,
            host: s.host ?? null,
            login: s.login ?? null,
            avatarUrl: s.avatarUrl ?? null,
          });
      } catch {}
    })();
  }, []);

  const openLogin = () => {
    setError(null);
    setShowPopup(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setStatus({ connected: false, host: null, login: null });
    setRepos(null);
  };

  const refreshList = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listRepos();
      setRepos(Array.isArray(r) ? r : []);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const onPopupSuccess = async (res: any) => {
    setShowPopup(false);
    setStatus({
      connected: !!res.connected,
      host: res.host ?? null,
      login: res.login ?? null,
      avatarUrl: res.avatarUrl ?? null,
    });
    try {
      const r = await listRepos();
      setRepos(Array.isArray(r) ? r : []);
    } catch {
      setRepos(null);
    }
  };

  return (
    <div className="gitlab-auth">
      <div className="github-bar gitlab-bar">
        <button
          id="gitlab-login-btn"
          className="github-login-btn"
          onClick={status.connected ? handleLogout : openLogin}
          disabled={loading}
        >
          {loading
            ? "Chargement..."
            : status.connected
            ? "Se déconnecter de GitLab"
            : "Se connecter à GitLab"}
        </button>

        <span id="gitlab-status" className="github-status">
          {status.connected
            ? `GitLab: ${status.login ?? status.host}`
            : "GitLab non connecté"}
        </span>
      </div>

      {error && (
        <span className="error-msg gitlab-error-msg" style={{ marginLeft: 8 }}>
          {error}
        </span>
      )}

      {showPopup && (
        <GitLabPopup
          onClose={() => setShowPopup(false)}
          onSuccess={onPopupSuccess}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}
