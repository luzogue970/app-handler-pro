import Repository, { Repo } from "./repository/repository";

type Props = {
  local: Repo[];
  github: any[];
  gitlab: any[];
};

function normalizeKey(u?: string) {
  if (!u) return "";
  return u
    .replace(/^file:\/\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/i, "")
    .toLowerCase();
}

export default function RepoList({ local, github: remote, gitlab }: Props) {
  const localKeys = new Set(
    local.map((r) => normalizeKey(r.remote ?? r.path ?? r.name)).filter(Boolean)
  );

  //   {
  //     "id": 69056704,
  //     "name": "Back",
  //     "path": "lodger_m1_dev_b_czma/back",
  //     "description": "",
  //     "webUrl": "https://gitlab.com/lodger_m1_dev_b_czma/back",
  //     "sshUrl": "git@gitlab.com:lodger_m1_dev_b_czma/back.git",
  //     "httpUrl": "https://gitlab.com/lodger_m1_dev_b_czma/back.git",
  //     "visibility": "private",
  //     "defaultBranch": "main",
  //     "lastActivityAt": "2025-09-04T14:21:46.155Z"
  // }

  const filteredGithubRemote = (remote || []).filter((r: any) => {
    const candidates = [
      r.remote,
      r.path,
      r.githubMeta?.htmlUrl,
      r.githubMeta?.cloneUrl,
      r.cloneUrl ?? r.clone_url,
      r.htmlUrl ?? r.html_url,
      r.fullName ?? r.full_name,
      r.name,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    return !candidates.some((c) => localKeys.has(c));
  });

  const filteredgitlabRemote = (gitlab || []).filter((r: any) => {
    const candidates = [
      r.remote,
      r.path,
      r.githubMeta?.htmlUrl,
      r.githubMeta?.cloneUrl,
      r.cloneUrl ?? r.clone_url,
      r.htmlUrl ?? r.html_url,
      r.fullName ?? r.full_name,
      r.name,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    return !candidates.some((c) => localKeys.has(c));
  });

  return (
    <>
      {local.length > 0 && (
        <>
          <h2 style={{ marginTop: 18, marginLeft: 16, color: "#9ca3af" }}>
            local projects
          </h2>
          {local.map((repo, index) => (
            <Repository key={repo.path || index} repo={repo} index={index} />
          ))}
        </>
      )}

      {filteredGithubRemote.length > 0 && (
        <>
          <h2 style={{ marginTop: 18, marginLeft: 16, color: "#9ca3af" }}>
            github Remote only
          </h2>
          {filteredGithubRemote.map((r: any, i: number) => (
            <Repository key={r.path || `remote-${i}`} repo={r} index={i} />
          ))}
        </>
      )}

      {filteredgitlabRemote.length > 0 && (
        <>
          <h2 style={{ marginTop: 18, marginLeft: 16, color: "#9ca3af" }}>
            gitlab Remote only
          </h2>
          {filteredgitlabRemote.map((r: any, i: number) => (
            <Repository key={r.path || `remote-${i}`} repo={r} index={i} />
          ))}
        </>
      )}
    </>
  );
}
