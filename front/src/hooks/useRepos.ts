import { useEffect, useState, useMemo, useCallback } from "react";
import type { Repo } from "../components/repository/repository";
import type { Status } from "../components/github/github";
import * as GitHubService from "../services/githubService";
import * as GitLabService from "../services/gitlabService";

export function useRepos() {
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [githubStatus, setGithubStatus] = useState<Status>({
    connected: false,
    loading: false,
  });
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);




  const [gitlabRepos, setGitlabRepos] = useState<any[] | null>(null);
  const [gitlabStatusChecked, setGitlabStatusChecked] = useState(false);
  const [gitlabStatus, setGitlabStatus] = useState<any>({ connected: false });

  const normalizeUrl = (u?: string) =>
    (u || "").replace(/\.git$/, "").replace(/\/+$/, "").toLowerCase();

  const loadRepos = useCallback(async () => {
    try {
      const repos = await window.api.getRepos();
      setAllRepos(Array.isArray(repos) ? (repos as Repo[]) : []);
    } catch (err) {
      console.error("Failed to load local repos:", err);
      setAllRepos([]);
    }
  }, []);

  const loadGithubRepos = useCallback(async () => {
    try {
      const raw = await GitHubService.listRepos();
      if (!Array.isArray(raw)) {
        setGithubRepos([]);
        return;
      }
      const localRemotes = new Set(
        allRepos.map((r) => normalizeUrl(r.remote ?? r.path ?? "")).filter(Boolean)
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
  }, [allRepos]);


  useEffect(() => {
    (async () => {
      await loadRepos();
      try {
        setGithubStatus((s) => ({ ...s, loading: true }));
        const status = await GitHubService.getAuthStatus();
        if (status && status.connected) {
          setGithubStatus({
            connected: true,
            loading: false,
            login: status.login ?? null,
            error: null,
          });
          await loadGithubRepos();
        } else {
          setGithubStatus({ connected: false, loading: false, login: null, error: null });
        }
      } catch (err) {
        setGithubStatus({
          connected: false,
          loading: false,
          login: null,
          error: String(err ?? "Erreur"),
        });
      }
    })();

  }, []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      console.debug("[useRepos] repos-updated", detail);

      loadRepos();
      loadGithubRepos();
    };

    window.addEventListener("repos-updated", handler as EventListener);
    return () => window.removeEventListener("repos-updated", handler as EventListener);
  }, [loadRepos, loadGithubRepos]);

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

  function stringifyValues(obj: any, seen = new Set()): string {
    if (obj == null) return "";
    if (seen.has(obj)) return "";
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
      return String(obj);
    }
    if (typeof obj !== "object") return "";
    seen.add(obj);
    let parts: string[] = [];
    if (Array.isArray(obj)) {
      for (const v of obj) parts.push(stringifyValues(v, seen));
    } else {
      for (const k of Object.keys(obj)) {
        parts.push(stringifyValues((obj as any)[k], seen));
      }
    }
    return parts.filter(Boolean).join(" ");
  }

  const q = searchQuery.toLowerCase().trim();

  const repoMatches = (repo: any) => {
    if (!q) return true;
    const hay = stringifyValues(repo).toLowerCase();
    return hay.includes(q);
  };

  const localFiltered = allRepos.filter((r) => repoMatches(r));
  const remoteFiltered = githubRepos.filter((r) => repoMatches(r));

  async function refreshGitlab() {
    try {
      const repos = await GitLabService.listRepos();
      setGitlabRepos(Array.isArray(repos) ? repos : []);
      return repos;
    } catch (err) {
      setGitlabRepos(null);
      throw err;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const s = await GitLabService.getAuthStatus();
        setGitlabStatusChecked(true);
        if (s && s.connected) {
          setGitlabStatus({ connected: !!s.connected, host: s.host ?? null, login: s.login ?? null, avatarUrl: s.avatarUrl ?? null });
          try {
            const repos = await GitLabService.listRepos();
            setGitlabRepos(Array.isArray(repos) ? repos : []);
          } catch {
            setGitlabRepos(null);
          }
        } else {
          setGitlabStatus({ connected: false });
          setGitlabRepos(null);
        }
      } catch {
        setGitlabStatusChecked(true);
        setGitlabStatus({ connected: false });
        setGitlabRepos(null);
      }
    })();
  }, []);


  function matchQuery(repo: any, q: string) {
    if (!q) return true;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const vals = [
      repo.name,
      repo.path,
      repo.path_with_namespace,
      repo.full_name,
      repo.description,
      repo.webUrl,
      repo.web_url,
    ];
    return vals.some((v) => !!v && String(v).toLowerCase().includes(t));
  }


  const gitlabFiltered = useMemo(() => {
    if (!gitlabRepos) return [];
    return gitlabRepos.filter((r) => matchQuery(r, searchQuery));
  }, [gitlabRepos, searchQuery]);

  return {
    allRepos,
    githubRepos,
    localFiltered,
    remoteFiltered,
    searchQuery,
    setSearchQuery,
    githubStatus,
    deviceInfo,
    setDeviceInfo,
    handleLogin,
    handleLogout,
    onPopupSuccess,
    loadRepos,
    loadGithubRepos,
    gitlabRepos,
    gitlabFiltered,
    gitlabStatus,
    gitlabStatusChecked,
    refreshGitlab,
  };
}
