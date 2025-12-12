import { useCallback, useEffect, useState } from "react";
import * as GitLabService from "../services/gitlabService";
import { normalizeUrl } from "./utils";
import type { Repo } from "../components/repository/repository";


export function useGitlabRepo(allReposRef: () => Repo[]) {
  const [gitlabRepos, setGitlabRepos] = useState<any[] | null>(null);
  const [gitlabStatusChecked, setGitlabStatusChecked] = useState(false);
  const [gitlabStatus, setGitlabStatus] = useState<any>({ connected: false });

  const normalizeArray = useCallback((rawArray: any[]) => {
    const localRemotes = new Set(
      allReposRef().map((r) => normalizeUrl(r.remote ?? r.path ?? "")).filter(Boolean)
    );

    const reposs = allReposRef()


    return (rawArray || [])
      .map((r: any) => {
        const clone = normalizeUrl(
          r.sshUrl ?? r.ssh_url ?? r.ssh_url_to_repo ?? r.sshUrlToRepo ?? ""
        );
        const http = normalizeUrl(
          r.httpUrl ?? r.http_url ?? r.http_url_to_repo ?? r.httpUrlToRepo ?? ""
        );
        const web = normalizeUrl(r.webUrl ?? r.web_url ?? "");
        const name =
          r.name ??
          r.path_with_namespace ??
          r.pathWithNamespace ??
          r.path ??
          r.path_with_namespace ??
          "";

        return { raw: r, clone, http, web, name };
      })
      .filter((x: any) => !localRemotes.has(x.clone) && !localRemotes.has(x.http) && !localRemotes.has(x.web))
      .map((x: any) => ({
        name: x.name,
        path: "",
        remote: x.web || x.http || x.clone || null,
        type: "remote",
        launchCommand: null,
        launchCommands: [],
        isRemoteOnly: true,

        gitlabMeta: {
          id: x.raw.id,
          pathWithNamespace:
            x.raw.path_with_namespace ?? x.raw.pathWithNamespace ?? x.raw.path ?? null,
          description: x.raw.description ?? null,
          cloneUrl:
            x.raw.ssh_url_to_repo ??
            x.raw.sshUrl ??
            x.raw.clone_url ??
            x.raw.cloneUrl ??
            x.raw.http_url_to_repo ??
            x.raw.httpUrl ??
            null,
          webUrl: x.raw.web_url ?? x.raw.webUrl ?? null,
          visibility: x.raw.visibility ?? null,
          lastActivityAt: x.raw.last_activity_at ?? x.raw.lastActivityAt ?? null,
          defaultBranch: x.raw.default_branch ?? x.raw.defaultBranch ?? null,
        },
      }));
  }, [allReposRef]);

  const loadGitlabRepos = useCallback(async () => {
    console.debug("[useGitlabRepo] loadGitlabRepos called");
    try {
      const raw = await GitLabService.listRepos();
      console.debug("[useGitlabRepo] raw response type/length:", Array.isArray(raw) ? raw.length : typeof raw, raw && raw[0]);
      if (!Array.isArray(raw)) {
        setGitlabRepos([]);
        return;
      }

      const normalized = normalizeArray(raw);

      setGitlabRepos(normalized);
    } catch (err) {
      console.error("Failed to load GitLab repos:", err);
      setGitlabRepos([]);
    }
  }, [normalizeArray]);


  async function refreshGitlab() {
    try {
      await loadGitlabRepos();
      return gitlabRepos;
    } catch (err) {
      setGitlabRepos(null);
      throw err;
    }
  }

  const gitlabFiltered = (searchQuery: string) => {
    if (!gitlabRepos) return [];
    if (!searchQuery) return gitlabRepos;
    const q = searchQuery.toLowerCase().trim();
    return gitlabRepos.filter((r) => {
      const hay = JSON.stringify(r).toLowerCase();
      return hay.includes(q);
    });
  };

  async function initGitlabStatusAndRepos() {
    try {
      const s = await GitLabService.getAuthStatus();
      setGitlabStatusChecked(true);
      if (s && s.connected) {
        setGitlabStatus({ connected: !!s.connected, host: s.host ?? null, login: s.login ?? null, avatarUrl: s.avatarUrl ?? null });

        await loadGitlabRepos();
      } else {
        setGitlabStatus({ connected: false });
        setGitlabRepos(null);
      }
    } catch {
      setGitlabStatusChecked(true);
      setGitlabStatus({ connected: false });
      setGitlabRepos(null);
    }
  }
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail;
        if (!d || d.provider === "gitlab" || d.provider === undefined) {
          loadGitlabRepos().catch((e) => console.debug("[useGitlabRepo] refresh failed:", e));
        }
      } catch (err) {
        console.debug("[useGitlabRepo] repos-updated handler error:", err);
      }
    };
    window.addEventListener("repos-updated", handler as EventListener);
    return () => window.removeEventListener("repos-updated", handler as EventListener);
  }, [loadGitlabRepos]);

  return {
    gitlabRepos,
    loadGitlabRepos,
    gitlabFiltered,
    gitlabStatus,
    gitlabStatusChecked,
    refreshGitlab,
    initGitlabStatusAndRepos,
    setGitlabRepos,
    setGitlabStatus,
  };
}
