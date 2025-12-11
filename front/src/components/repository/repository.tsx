import { useState } from "react";
import "./repository.css";
import * as GitHubService from "../../services/githubService";

export interface Repo {
  name: string;
  path?: string;
  remote?: string | null;
  type?: string | null;
  launchCommand?: string | null;
  launchCommands?: string[] | null;
}

type Props = {
  repo: Repo;
  index: number;
};

export default function Repository({ repo, index }: Props) {
  const commands =
    Array.isArray(repo.launchCommands) && repo.launchCommands.length
      ? repo.launchCommands
      : repo.launchCommand
      ? [repo.launchCommand]
      : [];
  const hasLaunch = commands.length > 0;
  const mainCommand = hasLaunch ? commands[0] : null;
  const [busy, setBusy] = useState(false);

  const handleOpen = () => {
    window.api.openInVSCode(repo.path || "");
  };

  const pullProject = async () => {
    try {
      const res = await window.github.pullProject?.(
        repo.remote || repo.path || ""
      );
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent("repos-updated", { detail: res }));
      } else {
        console.warn("Pull result:", res);
      }
    } catch (err) {
      console.error("Pull failed:", err);
    }
  };

  const handleOpenRemote = (url: string) => {
    window.open(url, "_blank");
  };

  const handleLaunch = () => {
    window.api.launchApp(repo.path || "", repo.launchCommands);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState(repo.name ?? "");

  const createAndPush = async (localPath: string) => {
    if (!localPath) {
      alert("Aucun chemin local valide pour push.");
      return;
    }
    if (!newRepoName || !newRepoName.trim()) {
      alert("Nom du repo requis.");
      return;
    }

    setBusy(true);
    try {
      const create = await GitHubService.createRemoteRepo(
        newRepoName.trim(),
        "",
        false
      );
      const remoteUrl = create.data.clone_url;

      if (!remoteUrl) {
        alert("Erreur création remote");
        return;
      }

      const pushed = await GitHubService.pushLocalToRemote(
        localPath,
        remoteUrl,
        "main"
      );

      if (pushed.success) {
        window.dispatchEvent(
          new CustomEvent("repos-updated", { detail: pushed })
        );
        setShowCreateModal(false);
      } else {
        alert("Push failed: " + (pushed.error || "unknown"));
      }
    } finally {
      setBusy(false);
    }
  };



  return (
    <div className="app-card" data-path={repo.path} key={repo.path || index}>
      <div className="app-info">
        <div className="app-header">
          <span className="app-name">{repo.name}</span>
          <span className="app-type">{repo.type || "inconnu"}</span>
        </div>
        {/* <div className="app-path">{repo.path}</div> */}
        <div className="app-remote">
          {repo.remote ? (
            <a href={repo.remote} target="_blank" rel="noreferrer">
              {repo.remote}
            </a>
          ) : (
            <em>Pas de remote</em>
          )}
        </div>

        {hasLaunch ? (
          <div className="app-launch-cmd">
            Lancement principal : <code>{mainCommand}</code>
          </div>
        ) : (
          <div className="app-launch-cmd disabled">
            <em>Aucune commande de lancement détectée</em>
          </div>
        )}
      </div>

      <div className="app-actions">
        {repo.path ? (
          <button
            className="btn vscode-open"
            onClick={() => handleOpen?.()}
            data-index={index}
          >
            Ouvrir VS Code
          </button>
        ) : (
          <button
            className="btn pull-project"
            onClick={() => pullProject?.()}
            data-index={index}
          >
            Pull le projet
          </button>
        )}
        {repo.remote ? (
          <button
            className="btn btn-remote"
            onClick={() => repo.remote && handleOpenRemote?.(repo.remote)}
            data-index={index}
          >
            Ouvrir le remote
          </button>
        ) : (
          <button
            className="btn btn-create-remote"
            onClick={() => {
              setShowCreateModal(true);
              setNewRepoName(repo.name ?? "");
            }}
            data-index={index}
          >
            créer un repo github
          </button>
        )}
        <button
          className="btn btn-launch"
          onClick={() => hasLaunch && handleLaunch?.()}
          data-index={index}
          disabled={!hasLaunch}
        >
          Lancer l'app
        </button>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#020617",
              color: "#e5e7eb",
              padding: 18,
              borderRadius: 8,
              width: 420,
              boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            }}
          >
            <h3 style={{ margin: 0 }}>Créer le repo GitHub</h3>
            <p style={{ color: "#9ca3af", marginTop: 8 }}>Nom du repo :</p>
            <input
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #374151",
                marginBottom: 12,
                background: "#0b1220",
                color: "#e5e7eb",
              }}
              placeholder="nom-du-repo"
            />
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRepoName(repo.name ?? "");
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#e5e7eb",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => createAndPush(repo.path || "")}
                disabled={busy}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "#111827",
                  color: "#e5e7eb",
                }}
              >
                {busy ? "En cours..." : "Créer & Push"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
