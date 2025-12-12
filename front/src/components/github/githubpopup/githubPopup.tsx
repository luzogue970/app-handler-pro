import { useEffect, useState } from "react";
import "./githubPopup.css";

type DeviceInfo = {
  device_code: string;
  user_code: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
};

type Props = {
  deviceInfo: DeviceInfo;
  onClose: () => void;
  onSuccess: (status: { connected: boolean; login?: string | null }) => void;
  onError?: (err: string) => void;
};

export default function GitHubPopup({
  deviceInfo,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [remaining, setRemaining] = useState(deviceInfo.expires_in);
  const [polling, setPolling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0 && polling) {
      setPolling(false);
      setStatusMsg("Code expiré.");
    }
  }, [remaining, polling]);

  const startPolling = async () => {
    setPolling(true);
    setBusy(true);
    setStatusMsg("En attente de l'autorisation sur GitHub...");
    try {
      const status = await window.github.completeDeviceLogin(
        deviceInfo.device_code,
        deviceInfo.interval,
        deviceInfo.expires_in
      );
      setStatusMsg("Connecté !");
      onSuccess(status);
      setBusy(false);
      onClose();
    } catch (err: any) {
      const msg = String(err?.message ?? err ?? "Erreur lors de la connexion");
      setStatusMsg(`Erreur: ${msg}`);
      setPolling(false);
      setBusy(false);
      onError?.(msg);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(deviceInfo.user_code);
      setStatusMsg("Code copié dans le presse-papiers");
      setTimeout(() => setStatusMsg(null), 1800);
    } catch (err) {
      setStatusMsg("Impossible de copier le code");
      setTimeout(() => setStatusMsg(null), 1800);
    }
  };

  return (
    <div className="gh-popup-backdrop">
      <div className="gh-popup">
        <h3>Connexion GitHub</h3>
        <p>
          Ouvre{" "}
          <strong>
            {deviceInfo.verification_uri_complete ||
              deviceInfo.verification_uri}
          </strong>{" "}
          et entre le code :
        </p>
        <div className="gh-code-row">
          <div className="gh-code" title="Code à entrer">
            {deviceInfo.user_code}
          </div>
          <button
            className="gh-copy-btn"
            onClick={copyCode}
            aria-label="Copier le code"
            title="Copier le code"
          >
            Copier
          </button>
        </div>
        <p className="gh-tip">
          Le code expire dans <strong>{remaining}s</strong>.
        </p>
        <div className="gh-status">{statusMsg}</div>
        <div className="gh-actions">
          <button
            onClick={() => {
              const url =
                deviceInfo.verification_uri_complete ||
                deviceInfo.verification_uri;
              if (url) window.open(url, "_blank");
            }}
          >
            Ouvrir GitHub
          </button>

          <button onClick={startPolling} disabled={polling || busy}>
            {busy ? "En cours..." : "J'ai entré le code — terminer"}
          </button>

          <button
            onClick={() => {
              setPolling(false);
              onClose();
            }}
            className="secondary"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
