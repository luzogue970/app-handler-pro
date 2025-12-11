import { useCallback, useState } from "react";
import * as GitLabService from "../services/gitlabService";
import { normalizeUrl } from "./utils";
import type { Repo } from "../components/repository/repository";


export function useGitlabRepo(allReposRef: () => Repo[]) {
  const [gitlabRepos, setGitlabRepos] = useState<any[] | null>(null);
  const [gitlabStatusChecked, setGitlabStatusChecked] = useState(false);
  const [gitlabStatus, setGitlabStatus] = useState<any>({ connected: false });

  const loadGitlabRepos = useCallback(async () => {
    try {
      const raw = await GitLabService.listRepos();
      if (!Array.isArray(raw)) {
        setGitlabRepos([]);
        return;
      }

      const localRemotes = new Set(
        allReposRef().map((r) => normalizeUrl(r.remote ?? r.path ?? "")).filter(Boolean)
      );

      const normalized = raw
        .map((r: any) => {
          const clone = normalizeUrl(r.sshUrl ?? r.ssh_url ?? r.ssh_url_to_repo ?? "");
          const http = normalizeUrl(r.httpUrl ?? r.http_url ?? r.http_url_to_repo ?? "");
          const web = normalizeUrl(r.webUrl ?? r.web_url ?? "");
          const name = r.name ?? r.path_with_namespace ?? r.path ?? "";
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
            pathWithNamespace: x.raw.path_with_namespace ?? x.raw.path,
            description: x.raw.description,
            cloneUrl: x.raw.ssh_url_to_repo ?? x.raw.clone_url ?? x.raw.http_url_to_repo ?? null,
            webUrl: x.raw.web_url ?? null,
            visibility: x.raw.visibility,
            lastActivityAt: x.raw.last_activity_at ?? null,
            defaultBranch: x.raw.default_branch ?? null,
          },
        }));

      setGitlabRepos(normalized);
    } catch (err) {
      console.error("Failed to load GitLab repos:", err);
      setGitlabRepos([]);
    }
  }, [allReposRef]);

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
  }

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
