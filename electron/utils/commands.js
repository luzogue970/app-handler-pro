import { spawn } from "node:child_process";

export async function openInVSCode(targetPath) {
  if (!targetPath) return { success: false, error: "no path" };
  const child = spawn("code", [targetPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}
