declare global {
  interface Window {
    api: {
      getRepos: () => Promise<any[]>;
      openInVSCode: (path: string) => void
      launchApp: (path: string, commands: string[] | null | undefined) => void
    };
    github: {
      login: () => any;
      listRepos: () => any;
      logout: () => any;
      startDeviceFlow: () => any;
      completeDeviceLogin: (deviceCode: string, interval: number, expiresIn: number) => any;
      getAuthStatus: () => any;
      pullProject: (remote: string) => any;
      createRemoteRepo: (args: any) => any;
      pushLocalToRemote: (args: any) => any;
    };

    gitlab: {
      getAuthStatus: () => Promise<{ connected: boolean; host?: string | null; login?: string | null; avatarUrl?: string | null }>;
      loginWithToken: (host: string, token: string) => Promise<{ connected: boolean; host?: string | null; login?: string | null; avatarUrl?: string | null }>;
      logout: () => Promise<any>;
      listRepos: () => Promise<Array<any>>;
    };
  }
}

export {};
