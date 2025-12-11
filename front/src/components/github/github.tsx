import { useEffect, useState, useCallback } from "react";
import "./github.css";
import { getAuthStatus } from "../../services/githubService";
export type Status = {
  connected: boolean;
  loading: boolean;
  login?: string | null;
  error?: string | null;
};

type Props = {
  status: Status;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export default function GitHubAuth({ status, onLogin, onLogout }: Props) {
  const [localStatus, setLocalStatus] = useState<Status>(
    status ?? { connected: false, loading: false, login: null, error: null }
  );

  useEffect(() => {
    if (status) {
      setLocalStatus(status);
    }
  }, [status]);

  const refreshStatus = useCallback(async () => {
    setLocalStatus((s) => ({ ...s, loading: true }));
    try {
      const s: any = await getAuthStatus();
      setLocalStatus({
        connected: !!s?.connected,
        loading: false,
        login: s?.login ?? null,
        error: s?.error ?? null,
      });
    } catch (err: any) {
      setLocalStatus({
        connected: false,
        loading: false,
        login: null,
        error: err?.message ?? String(err),
      });
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleLogin = async () => {
    setLocalStatus((s) => ({ ...s, loading: true }));
    try {
      await onLogin();
    } finally {
      await refreshStatus();
    }
  };

  const handleLogout = async () => {
    setLocalStatus((s) => ({ ...s, loading: true }));
    try {
      await onLogout();
    } finally {
      await refreshStatus();
    }
  };

  const isConnected = localStatus?.connected;

  return (
    <div className="github-bar">
      <button
        id="github-login-btn"
        onClick={isConnected ? handleLogout : handleLogin}
        disabled={localStatus?.loading}
      >
        {localStatus?.loading
          ? "Chargement..."
          : isConnected
          ? "Se déconnecter de GitHub"
          : "Se connecter à GitHub"}
      </button>
      <span id="github-status">
        {isConnected
          ? `Connecté en tant que ${localStatus.login ?? "?"}`
          : "GitHub Non connecté"}
      </span>
      {localStatus?.error && (
        <span className="error-msg">Erreur: {localStatus.error}</span>
      )}
    </div>
  );
}
