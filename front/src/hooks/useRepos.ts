import { useEffect, useMemo, useCallback, useState } from "react";
import { useLocalRepo } from "./useLocalRepo";
import { useGithubRepo } from "./useGithubRepo";
import { useGitlabRepo } from "./useGitlabRepo";

/**
 * useRepos - composition hook
 * keeps the previous external API used by App.tsx / components
 */
export function useRepos() {

  const local = useLocalRepo();

  const allReposRef = useCallback(() => local.allRepos, [local.allRepos]);


  const github = useGithubRepo(allReposRef);


  const gitlab = useGitlabRepo(allReposRef);


  const [searchQuery, setSearchQuery] = useState<string>("");


  const localFiltered = useMemo(
    () => local.localFiltered(searchQuery),
    [local.localFiltered, searchQuery, local.allRepos]
  );
  const remoteFiltered = useMemo(
    () => github.remoteFiltered(searchQuery),
    [github.remoteFiltered, searchQuery, github.githubRepos]
  );
  const gitlabFiltered = useMemo(
    () => gitlab.gitlabFiltered(searchQuery),
    [gitlab.gitlabFiltered, searchQuery, gitlab.gitlabRepos]
  );


  useEffect(() => {
    (async () => {
      await local.loadRepos();
      await github.loadGithubRepos();
      await gitlab.initGitlabStatusAndRepos();
    })();

  }, []);


  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      console.debug("[useRepos] repos-updated", detail);
      local.loadRepos();
      github.loadGithubRepos();
      gitlab.loadGitlabRepos();
    };

    window.addEventListener("repos-updated", handler as EventListener);
    return () => window.removeEventListener("repos-updated", handler as EventListener);
  }, [local.loadRepos, github.loadGithubRepos, gitlab.loadGitlabRepos]);

  return {

    allRepos: local.allRepos,
    loadRepos: local.loadRepos,

    githubRepos: github.githubRepos,
    loadGithubRepos: github.loadGithubRepos,
    githubStatus: github.githubStatus,
    deviceInfo: github.deviceInfo,
    handleLogin: github.handleLogin,
    handleLogout: github.handleLogout,
    onPopupSuccess: github.onPopupSuccess,
    setDeviceInfo: github.setDeviceInfo,

    gitlabRepos: gitlab.gitlabRepos,
    loadGitlabRepos: gitlab.loadGitlabRepos,
    gitlabFiltered,
    gitlabStatus: gitlab.gitlabStatus,
    gitlabStatusChecked: gitlab.gitlabStatusChecked,
    refreshGitlab: gitlab.refreshGitlab,

    searchQuery,
    setSearchQuery,
    localFiltered,
    remoteFiltered,
  };
}

export default useRepos;
