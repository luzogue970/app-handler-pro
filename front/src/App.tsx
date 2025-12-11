import { useEffect } from "react";
import "./app.css";
import SearchBar from "./components/search-bar/searchBar";
import GitHubAuth from "./components/github/github";
import GitHubPopup from "./components/github/githubpopup/githubPopup";
import RepoList from "./components/RepoList";
import GitLab from "./components/gitlab/GitLab";
import { useRepos } from "./hooks/useRepos";

export default function App() {
  const {
    localFiltered,
    remoteFiltered,
    gitlabFiltered,
    githubStatus,
    deviceInfo,
    handleLogin,
    handleLogout,
    onPopupSuccess,
    setDeviceInfo,
    searchQuery,
    setSearchQuery,
  } = useRepos();

  useEffect(() => {}, []);

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

      <div className="repos-container">
        <RepoList
          local={localFiltered}
          github={remoteFiltered}
          gitlab={gitlabFiltered ?? []}
        />
      </div>
    </div>
  );
}
