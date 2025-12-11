import * as GitHubService from "./githubService";
import * as GitLabService from "./gitlabService";

type Provider = "github" | "gitlab" | "unknown";

function detectProviderFromRepo(repo: any): Provider {
  if (!repo) return "unknown";
  if (repo.githubMeta) return "github";
  if (repo.gitlabMeta) return "gitlab";
  if (typeof repo.remote === "string") {
    const r = repo.remote.toLowerCase();
    if (r.includes("github.com")) return "github";
    if (r.includes("gitlab.")) return "gitlab";
  }
  return "unknown";
}

function detectProviderFromUrl(url?: string): Provider {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.includes("github.com")) return "github";
  if (u.includes("gitlab.")) return "gitlab";
  return "unknown";
}

export async function pullProjectByRepo(repo: any) {
  const provider = detectProviderFromRepo(repo);
  const target = repo.remote || repo.path || "";
  if (provider === "github") {
    return await GitHubService.pullProject(target);
  } else if (provider === "gitlab") {
    return await GitLabService.pullProject(target);
  } else {
    try {
      return await GitHubService.pullProject(target);
    } catch {
      return await GitLabService.pullProject(target);
    }
  }
}

export async function pushLocalToRemote(localPath: string, remoteUrl: string, branch = "main") {
  const provider = detectProviderFromUrl(remoteUrl);
  if (provider === "github") {
    return await GitHubService.pushLocalToRemote(localPath, remoteUrl, branch);
  } else if (provider === "gitlab") {
    if (typeof (GitLabService as any).pushLocalRepo === "function") {
      return await (GitLabService as any).pushLocalRepo(localPath, remoteUrl, branch);
    }
    if (typeof (GitLabService as any).pushLocalToRemote === "function") {
      return await (GitLabService as any).pushLocalToRemote(localPath, remoteUrl, branch);
    }
    throw new Error("GitLab push API not available");
  } else {
    throw new Error("Unknown provider for remote: " + remoteUrl);
  }
}

export async function createRemoteRepoForProvider(provider: Provider | string, name: string, description = "", isPrivate = false) {
  const p = (provider as Provider) ?? detectProviderFromUrl("");
  if (p === "gitlab") {
    if (typeof (GitLabService as any).createRemoteRepo === "function") {

      return await (GitLabService as any).createRemoteRepo({ name, description, private: isPrivate });
    }
    throw new Error("GitLab createRemoteRepo API not available");
  }
  return await GitHubService.createRemoteRepo(name, description, isPrivate);
}
