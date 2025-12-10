import "./app.css";
import React, { useEffect, useState } from "react";
import SearchBar from "./components/search-bar/searchBar";
import GitHubAuth from "./components/github/github";
import GitHubPopup from "./components/github/githubpopup/githubPopup";
import RepoList from "./components/RepoList";
import GitLab from "./components/gitlab/GitLab";
import { useRepos } from "./hooks/useRepos";
import {
  getAuthStatus as getGitlabAuthStatus,
  listRepos as listGitlabRepos,
} from "./services/gitlabService";

export default function App() {
  const {
    localFiltered,
    remoteFiltered,
    searchQuery,
    setSearchQuery,
    githubStatus,
    deviceInfo,
    handleLogin,
    handleLogout,
    onPopupSuccess,
    setDeviceInfo,
  } = useRepos();

  const [gitlabRepos, setGitlabRepos] = useState<any[] | null>(null);
  const [gitlabStatusChecked, setGitlabStatusChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getGitlabAuthStatus();
        setGitlabStatusChecked(true);
        if (s && s.connected) {
          const repos = await listGitlabRepos();
          setGitlabRepos(Array.isArray(repos) ? repos : []);
        }
      } catch (err) {
        setGitlabRepos(null);
        setGitlabStatusChecked(true);
      }
    })();
  }, []);

  return (
    <div>
      <h1 id="main-title">repositories</h1>

      <GitHubAuth
        status={githubStatus}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {deviceInfo && (
        <GitHubPopup
          deviceInfo={deviceInfo}
          onClose={() => setDeviceInfo(null)}
          onSuccess={onPopupSuccess}
          onError={() => {}}
        />
      )}
      <GitLab />

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div></div>
      </div>

      <div className="repos-container">
        <RepoList
          local={localFiltered}
          remote={remoteFiltered}
          gitlab={gitlabRepos ?? []}
        />
      </div>
    </div>
  );
}
