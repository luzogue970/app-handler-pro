import React, { useState } from "react";
import { loginWithToken } from "../../services/gitlabService";
import "./gitlabPopup.css";

type Props = {
  onClose: () => void;
  onSuccess: (res: any) => void;
  onError?: (err: string) => void;
};

export default function GitLabPopup({ onClose, onSuccess, onError }: Props) {
  const [host, setHost] = useState<string>("https://gitlab.com");
  const [token, setToken] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await loginWithToken(
        host.trim() || "https://gitlab.com",
        token.trim()
      );
      setStatusMsg("Connecté.");
      onSuccess(res);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setStatusMsg(`Erreur: ${msg}`);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setStatusMsg(null);
    onClose();
  };

  return (
    <div className="gitlab-popup-backdrop gh-popup-backdrop">
      <div className="gitlab-popup gh-popup">
        <h3>Connexion GitLab</h3>
        <form onSubmit={submit}>
          <label>
            Host
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="https://gitlab.com or https://gitlab.company"
            />
          </label>

          <label style={{ marginTop: 8 }}>
            Personal Access Token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="PAT"
            />
          </label>

          <div className="gh-actions gitlab-popup-actions">
            <button
              type="button"
              className="secondary"
              onClick={close}
              disabled={busy}
            >
              Annuler
            </button>
            <button type="submit" disabled={busy || !token.trim()}>
              {busy ? "Connexion..." : "Se connecter"}
            </button>
          </div>

          {statusMsg && (
            <div className="gitlab-popup-status" style={{ marginTop: 10 }}>
              {statusMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
