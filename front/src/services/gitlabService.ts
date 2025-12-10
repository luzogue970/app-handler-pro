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