import { useCallback, useState } from "react";
import type { Repo } from "../components/repository/repository";
import { stringifyValues } from "./utils";

/**
 * useLocalRepo
 * - expose allRepos, loadRepos, localFiltered (filter by searchQuery)
 */
export function useLocalRepo() {
  const [allRepos, setAllRepos] = useState<Repo[]>([]);

  const loadRepos = useCallback(async () => {
    try {
      const repos = await window.api.getRepos();
      setAllRepos(Array.isArray(repos) ? (repos as Repo[]) : []);
    } catch (err) {
      console.error("Failed to load local repos:", err);
      setAllRepos([]);
    }
  }, []);

  const localFiltered = (searchQuery: string) => {
    if (!searchQuery) return allRepos;
    const q = searchQuery.toLowerCase().trim();
    return allRepos.filter((r) => stringifyValues(r).toLowerCase().includes(q));
  };

  return {
    allRepos,
    loadRepos,
    localFiltered,
    setAllRepos,
  };
}
