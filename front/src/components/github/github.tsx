import "./github.css";

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
  const isConnected = status?.connected;

  return (
    <div className="github-bar">
      <button
        id="github-login-btn"
        onClick={isConnected ? onLogout : onLogin}
        disabled={status?.loading}
      >
        {status?.loading
          ? "Chargement..."
          : isConnected
          ? "Se déconnecter de GitHub"
          : "Se connecter à GitHub"}
      </button>
      <span id="github-status">
        {isConnected
          ? `Connecté en tant que ${status.login ?? "?"}`
          : "Non connecté"}
      </span>
      {status?.error && (
        <span className="error-msg">Erreur: {status.error}</span>
      )}
    </div>
  );
}
