import { useState } from "react";
import "./repository.css";
import * as RepoService from "../../services/repoService";

export interface Repo {
  name: string;
  path?: string;
  remote?: string | null;
  type?: string | null;
  launchCommand?: string | null;
  launchCommands?: string[] | null;
  githubMeta?: any;
  gitlabMeta?: any;
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
    setBusy(true);
    try {
      const res = await RepoService.pullProjectByRepo(repo);
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent("repos-updated", { detail: res }));
      } else {
        console.warn("Pull result:", res);
      }
    } catch (err) {
      console.error("Pull failed:", err);
    } finally {
      setBusy(false);
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
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [newRepoProvider, setNewRepoProvider] = useState<"github" | "gitlab">(
    "github"
  );

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
      // create remote on selected provider via RepoService
      const create = await RepoService.createRemoteRepoForProvider(
        newRepoProvider,
        newRepoName.trim(),
        newRepoDescription,
        newRepoPrivate
      );

      // debug: always log full response for troubleshooting
      console.debug("[Repository] create remote response:", create);

      // helper to pick/build a cloneable remote URL
      const pickRemoteUrl = (resp: any) => {
        if (!resp) return null;
        // common properties returned by providers / IPC
        const candidates = [
          resp?.data?.clone_url,
          resp?.data?.ssh_url_to_repo,
          resp?.data?.http_url_to_repo,
          resp?.data?.http_url,
          resp?.data?.ssh_url,
          resp?.data?.cloneUrl,
          resp?.data?.sshUrl,
          resp?.data?.httpUrl,
          resp?.clone_url,
          resp?.ssh_url_to_repo,
          resp?.http_url_to_repo,
          resp?.http_url,
          resp?.ssh_url,
          resp?.cloneUrl,
          resp?.sshUrl,
          resp?.httpUrl,
          resp?.web_url,
          resp?.html_url,
          resp?.webUrl,
          resp?.htmlUrl,
        ].filter(Boolean);

        // prefer ssh or http clone url
        for (const c of candidates) {
          const s = String(c);
          if (
            /\.git$/.test(s) ||
            /ssh:|git@/i.test(s) ||
            /^https?:\/\//i.test(s)
          )
            return s;
        }

        // if only web_url present, try to build http clone (.git)
        const web =
          resp?.data?.web_url ??
          resp?.web_url ??
          resp?.webUrl ??
          resp?.html_url ??
          resp?.htmlUrl;
        if (web) {
          try {
            const w = String(web).replace(/\/+$/, "");
            return `${w}.git`;
          } catch {}
        }

        return null;
      };

      console.log("create : " + JSON.stringify(create));


      const remoteUrl = pickRemoteUrl(create);

      console.log("remoteUrl : " + remoteUrl);



      if (!remoteUrl) {
        // show full response to help debugging
          typeof create === "object"
            ? JSON.stringify(create, null, 2)
            : String(create);
        console.error(
          "[Repository] create remote returned no usable url:",
          create
        );
        alert(
          "Erreur création remote : URL introuvable. Voir console pour la réponse complète."
        );
        // optional: open devtools or copy response to clipboard
        return;
      }

      console.debug("[Repository] using remoteUrl:", remoteUrl);

      const pushed = await RepoService.pushLocalToRemote(
        localPath,
        remoteUrl,
        "main"
      );

      if (pushed && pushed.success) {
        window.dispatchEvent(
          new CustomEvent("repos-updated", { detail: pushed })
        );
        setShowCreateModal(false);
      } else {
        console.error("[Repository] push failed:", pushed);
        alert("Push failed: " + (pushed?.error || "unknown"));
      }
    } catch (err: any) {
      console.error("createAndPush failed:", err);
      alert("Erreur: " + (err?.message ?? String(err)));
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
            disabled={busy}
          >
            Ouvrir VS Code
          </button>
        ) : (
          <button
            className="btn pull-project"
            onClick={() => pullProject?.()}
            data-index={index}
            disabled={busy}
          >
            {busy ? "En cours..." : "Pull le projet"}
          </button>
        )}
        {repo.remote ? (
          <button
            className="btn btn-remote"
            onClick={() => repo.remote && handleOpenRemote?.(repo.remote)}
            data-index={index}
            disabled={busy}
          >
            Ouvrir le remote
          </button>
        ) : (
          <button
            className="btn btn-create-remote"
            onClick={() => {
              setShowCreateModal(true);
              setNewRepoName(repo.name ?? "");
              setNewRepoDescription("");
              setNewRepoPrivate(false);
              setNewRepoProvider("github");
            }}
            data-index={index}
            disabled={busy}
          >
            créer un repo distant
          </button>
        )}
        <button
          className="btn btn-launch"
          onClick={() => hasLaunch && handleLaunch?.()}
          data-index={index}
          disabled={!hasLaunch || busy}
        >
          Lancer l'app
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 style={{ margin: 0 }}>
              Créer le repo (
              {newRepoProvider === "github" ? "GitHub" : "GitLab"})
            </h3>
            <p className="muted" style={{ marginTop: 8 }}>
              Nom du repo :
            </p>
            <input
              className="modal-input"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              placeholder="nom-du-repo"
            />

            <p className="muted" style={{ marginTop: 8 }}>
              Description (optionnel) :
            </p>
            <input
              className="modal-input"
              value={newRepoDescription}
              onChange={(e) => setNewRepoDescription(e.target.value)}
              placeholder="Description"
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name={`provider-${index}`}
                  checked={newRepoProvider === "github"}
                  onChange={() => setNewRepoProvider("github")}
                />{" "}
                GitHub
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name={`provider-${index}`}
                  checked={newRepoProvider === "gitlab"}
                  onChange={() => setNewRepoProvider("gitlab")}
                />{" "}
                GitLab
              </label>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginLeft: "auto",
                }}
              >
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                />{" "}
                Privé
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="btn modal-cancel"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRepoName(repo.name ?? "");
                }}
                disabled={busy}
              >
                Annuler
              </button>
              <button
                className="btn modal-create"
                onClick={() => createAndPush(repo.path || "")}
                disabled={busy}
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
