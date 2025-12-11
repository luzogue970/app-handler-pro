export const getAuthStatus = async () => {
  return await window.github?.getAuthStatus?.();
};

export const startDeviceFlow = async () => {
  return await window.github?.startDeviceFlow?.();
};

export const completeDeviceLogin = async (deviceCode: string, interval: number, expiresIn: number) => {
  return await window.github?.completeDeviceLogin?.(deviceCode, interval, expiresIn);
};

export const listRepos = async () => {
  return await window.github?.listRepos?.();
};

export const logout = async () => {
  return await window.github?.logout?.();
};

export const createRemoteRepo = async (name: string, description: string, priavtee: boolean) => {
  return await window.github?.createRemoteRepo({name, description, priavtee});
}

export const pullProject = async (remote: string) => {
  return await window.github?.pullProject(remote);
}

export const pushLocalToRemote = async (localPath: string, remoteUrl: string, branch: string) => {
  return await window.github?.pushLocalToRemote({localPath, remoteUrl, branch});
}
