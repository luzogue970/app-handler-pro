export const getAuthStatus = async () => {
  return await window.gitlab?.getAuthStatus?.();
};

export const loginWithToken = async (host: string, token: string) => {
  return await window.gitlab?.loginWithToken?.(host, token);
};

export const listRepos = async () => {
  return await window.gitlab?.listRepos?.();
};

export const logout = async () => {
  return await window.gitlab?.logout?.();
};

export const pullProject = async (remote: string) => {
  return await window.gitlab.pullProject(remote);
};

export const pushLocalToRemote = async (localPath: string, remoteUrl: string, branch?: string) => {
  return await window.gitlab.pushLocalToRemote({ localPath, remoteUrl, branch });
};

export const createRemoteRepo = async (name: string, description?: string, isPrivate?: boolean, namespaceId?: number | null) => {
  return await window.gitlab.createRemoteRepo({ name, description, isPrivate: !!isPrivate, namespaceId: namespaceId ?? null });
};
