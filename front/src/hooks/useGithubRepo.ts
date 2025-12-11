import { useCallback, useState } from "react";
import type { Repo } from "../components/repository/repository";
import type { Status } from "../components/github/github";
import * as GitHubService from "../services/githubService";
import { normalizeUrl } from "./utils";


export function useGithubRepo(allReposRef: () => Repo[]) {
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [githubStatus, setGithubStatus] = useState<Status>({
    connected: false,
    loading: false,
  });
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);

  const loadGithubRepos = useCallback(async () => {
    try {
      const raw = await GitHubService.listRepos();
      if (!Array.isArray(raw)) {
        setGithubRepos([]);
        return;
      }
      const localRemotes = new Set(
        allReposRef().map((r) => normalizeUrl(r.remote ?? r.path ?? "")).filter(Boolean)
      );

      const normalized = raw
        .map((r: any) => {
          const clone = normalizeUrl(r.cloneUrl ?? r.clone_url ?? "");
          const html = normalizeUrl(r.htmlUrl ?? r.html_url ?? "");
          const name = r.name ?? r.fullName ?? r.full_name ?? "";
          return { raw: r, clone, html, name };
        })
        .filter((x: any) => !localRemotes.has(x.clone) && !localRemotes.has(x.html))
        .map((x: any) => ({
          name: x.name,
          path: "",
          remote: x.html || x.clone || null,
          type: "remote",
          launchCommand: null,
          launchCommands: [],
          isRemoteOnly: true,
          githubMeta: {
            id: x.raw.id,
            fullName: x.raw.fullName ?? x.raw.full_name,
            description: x.raw.description,
            cloneUrl: x.raw.cloneUrl ?? x.raw.clone_url,
            htmlUrl: x.raw.htmlUrl ?? x.raw.html_url,
            updatedAt: x.raw.updatedAt ?? x.raw.updated_at,
          },
        }));

      setGithubRepos(normalized);
    } catch (err) {
      console.error("Failed to load GitHub repos:", err);
      setGithubRepos([]);
    }
  }, [allReposRef]);

  const handleLogin = async () => {
    try {
      setGithubStatus((s) => ({ ...s, loading: true }));
      const info = await GitHubService.startDeviceFlow();
      if (!info || info.error) {
        setGithubStatus({ connected: false, loading: false, login: null, error: info?.error ?? "startDeviceFlow failed" });
        return;
      }
      setDeviceInfo(info);
    } catch (err) {
      setGithubStatus({ connected: false, loading: false, login: null, error: String(err ?? "start failed") });
    }
  };

  const handleLogout = async () => {
    try {
      await GitHubService.logout();
      setGithubStatus({ connected: false, loading: false, login: null, error: null });
      setGithubRepos([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const onPopupSuccess = (status: { connected: boolean; login?: string | null }) => {
    setGithubStatus({ connected: !!status.connected, loading: false, login: status.login ?? null, error: null });
    setDeviceInfo(null);
    if (status.connected) loadGithubRepos();
  };

  const remoteFiltered = (searchQuery: string) => {
    if (!searchQuery) return githubRepos;
    const q = searchQuery.toLowerCase().trim();
    return githubRepos.filter((r) => {
      const hay = JSON.stringify(r).toLowerCase();
      return hay.includes(q);
    });
  };

  return {
    githubRepos,
    loadGithubRepos,
    remoteFiltered,
    githubStatus,
    deviceInfo,
    setDeviceInfo,
    handleLogin,
    handleLogout,
    onPopupSuccess,
    setGithubRepos,
    setGithubStatus,
  };
}
