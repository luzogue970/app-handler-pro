import path from "path";
import os from "os";
import fs from "fs";

export function readStoredToken(tokenPath) {
  try {
    if (!fs.existsSync(tokenPath)) return null;
    return JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  } catch {
    return null;
  }
}

export function writeStoredToken(data, tokenPath) {
  const token_dir = path.join(os.homedir(), ".conf-saver");
  try {
    if (!fs.existsSync(token_dir)) {
      fs.mkdirSync(token_dir, { recursive: true });
    }
    fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(tokenPath + " writeStoredToken error:", err);
  }
  return tokenPath;
}

export function clearStoredToken(tokenPath) {
  try {
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
  } catch (err) {
    console.error(tokenPath + "clearStoredToken error:", err);
  }
}
